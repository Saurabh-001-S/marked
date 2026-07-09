import prisma from '../config/db.js';

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// "1:2" -> 2, "1:2.5" -> 2.5, anything unparsable -> 0 (excluded from average rather than skewing it negative)
function parseRR(rr) {
  if (!rr) return 0;
  const parts = String(rr).split(':');
  const n = Number(parts[1]);
  return Number.isFinite(n) ? n : 0;
}

export async function computeMonthlyRollup(userId, challengeAccountId, month) {
  const account = await prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId } });
  if (!account) return null;

  const [year, mo] = month.split('-').map(Number);
  const monthStart = new Date(year, mo - 1, 1);
  const monthEnd = new Date(year, mo, 1);

  const logs = await prisma.dailyLog.findMany({
    where: { challengeAccountId, date: { gte: monthStart, lt: monthEnd } },
    include: { trades: true, emotionLog: true },
    orderBy: { date: 'asc' },
  });

  const allTrades = logs.flatMap((l) => l.trades);
  const totalTrades = allTrades.length;
  const wins = allTrades.filter((t) => (t.resultR ?? 0) > 0);
  const losses = allTrades.filter((t) => (t.resultR ?? 0) < 0);
  const winRate = totalTrades ? (wins.length / totalTrades) * 100 : null;
  const netR = allTrades.reduce((s, t) => s + (t.resultR ?? 0), 0);
  const avgRR = totalTrades ? allTrades.reduce((s, t) => s + parseRR(t.riskReward), 0) / totalTrades : null;
  const grossWin = wins.reduce((s, t) => s + Math.abs(t.pnl ?? 0), 0);
  const grossLoss = losses.reduce((s, t) => s + Math.abs(t.pnl ?? 0), 0);
  const profitFactor = grossLoss ? grossWin / grossLoss : null;

  const balances = logs.map((l) => l.accountBalance);
  let peak = -Infinity, maxDrawdown = 0;
  for (const b of balances) {
    peak = Math.max(peak, b);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, ((peak - b) / peak) * 100);
  }

  const weekBuckets = new Map();
  for (const log of logs) {
    const key = mondayOf(log.date).toISOString().slice(0, 10);
    if (!weekBuckets.has(key)) weekBuckets.set(key, []);
    weekBuckets.get(key).push(log);
  }
  const weeks = [...weekBuckets.entries()].map(([weekStarting, weekLogs], i) => {
    const weekTrades = weekLogs.flatMap((l) => l.trades);
    const weekNetR = weekTrades.reduce((s, t) => s + (t.resultR ?? 0), 0);
    const weekNetPnl = weekTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    return {
      label: `Week ${i + 1}`,
      weekStarting,
      startBalance: weekLogs[0]?.accountBalance ?? null,
      endBalance: weekLogs[weekLogs.length - 1]?.accountBalance ?? null,
      netR: weekNetR,
      netPnl: weekNetPnl,
      ruleBreaks: weekLogs.filter((l) => !l.stayedWithinMaxTrades || l.dailyLossLimitHit).length,
    };
  });

  const setupMap = new Map();
  for (const t of allTrades) {
    const key = t.method || 'Unlabeled';
    if (!setupMap.has(key)) setupMap.set(key, []);
    setupMap.get(key).push(t);
  }
  const setupBreakdown = [...setupMap.entries()].map(([setupType, trades]) => {
    const w = trades.filter((t) => (t.resultR ?? 0) > 0).length;
    return {
      setupType,
      timesTaken: trades.length,
      winRate: trades.length ? (w / trades.length) * 100 : null,
      avgRR: trades.length ? trades.reduce((s, t) => s + parseRR(t.riskReward), 0) / trades.length : null,
      netR: trades.reduce((s, t) => s + (t.resultR ?? 0), 0),
    };
  });

  const preferences = await prisma.setupPreference.findMany({ where: { userId } });
  const prefMap = Object.fromEntries(preferences.map((p) => [p.setupType, p.decision]));
  setupBreakdown.forEach((s) => { s.decision = prefMap[s.setupType] ?? 'UNDECIDED'; });

  const daysExceededMaxTrades = logs.filter((l) => !l.stayedWithinMaxTrades).length;
  const daysExceededLossLimit = logs.filter((l) => l.dailyLossLimitHit).length;
  const tradesWithoutCot = allTrades.filter((t) => !t.cotSignal).length;
  const disciplineScores = logs.map((l) => l.emotionLog?.overallEmotionalState).filter((v) => v != null);
  const avgDisciplineScore = disciplineScores.length ? disciplineScores.reduce((a, b) => a + b, 0) / disciplineScores.length : null;

  const startBalance = account.startingBalance;
  const currentBalance = balances[balances.length - 1] ?? startBalance;
  const profitTargetProgress = account.profitTargetPercent
    ? (((currentBalance - startBalance) / startBalance) / (account.profitTargetPercent / 100)) * 100
    : null;
  const distanceToDrawdownLimit = account.maxDrawdownPercent ? account.maxDrawdownPercent - maxDrawdown : null;
  const tradingDaysCompleted = logs.filter((l) => l.trades.length > 0).length;
  const onPaceToPassPhase = account.minTradingDays
    ? tradingDaysCompleted >= account.minTradingDays && (distanceToDrawdownLimit == null || distanceToDrawdownLimit > 0)
    : null;

  const existing = await prisma.monthlyStat.findUnique({
    where: { challengeAccountId_month: { challengeAccountId, month: monthStart } },
  });

  return {
    account: { name: account.name },
    month: monthStart,
    core: { totalTrades, winRate, avgRR, netR, profitFactor, maxDrawdown },
    weeks,
    setupBreakdown,
    discipline: { daysExceededMaxTrades, daysExceededLossLimit, tradesWithoutCot, avgDisciplineScore },
    challengeStatus: {
      profitTargetProgress,
      distanceToDrawdownLimit,
      tradingDaysCompleted,
      minTradingDays: account.minTradingDays,
      onPaceToPassPhase: existing?.onPaceToPassPhase ?? onPaceToPassPhase,
    },
    monthlyTakeaway: existing?.monthlyTakeaway ?? '',
  };
}

export async function getMonthlyRollup(req, res) {
  const data = await computeMonthlyRollup(req.userId, req.params.challengeAccountId, req.query.month);
  if (!data) return res.status(404).json({ error: 'Challenge account not found' });
  res.json(data);
}

export async function upsertMonthlyStat(req, res) {
  const { challengeAccountId } = req.params;
  const { month, monthlyTakeaway, onPaceToPassPhase } = req.body;

  const account = await prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId: req.userId } });
  if (!account) return res.status(404).json({ error: 'Challenge account not found' });

  const [year, mo] = month.split('-').map(Number);
  const monthStart = new Date(year, mo - 1, 1);

  const stat = await prisma.monthlyStat.upsert({
    where: { challengeAccountId_month: { challengeAccountId, month: monthStart } },
    update: { monthlyTakeaway, onPaceToPassPhase },
    create: { challengeAccountId, month: monthStart, monthlyTakeaway, onPaceToPassPhase },
  });

  res.json(stat);
}
