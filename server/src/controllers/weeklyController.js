import prisma from '../config/db.js';

export async function computeWeeklyRollup(userId, challengeAccountId, weekStarting) {
  const account = await prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId } });
  if (!account) return null;

  const start = new Date(weekStarting);
  const end = new Date(start);
  end.setDate(end.getDate() + 5); // Mon-Fri window

  const logs = await prisma.dailyLog.findMany({
    where: { challengeAccountId, date: { gte: start, lt: end } },
    include: { trades: { include: { emotion: true } }, emotionLog: true },
    orderBy: { date: 'asc' },
  });

  const days = logs.map((log) => {
    const wins = log.trades.filter((t) => (t.resultR ?? 0) > 0).length;
    const losses = log.trades.filter((t) => (t.resultR ?? 0) < 0).length;
    const netR = log.trades.reduce((sum, t) => sum + (t.resultR ?? 0), 0);
    const netPnl = log.trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    return {
      date: log.date,
      trades: log.trades.length,
      wins,
      losses,
      netR,
      netPnl,
      rulesFollowed: log.stayedWithinMaxTrades && !log.dailyLossLimitHit,
      disciplineScore: log.emotionLog?.overallEmotionalState ?? null,
      accountBalance: log.accountBalance,
    };
  });

  const allTrades = logs.flatMap((l) => l.trades);
  const urgeToBreakRulesCount = allTrades.filter((t) => t.emotion?.urgeToBreakRules).length;
  const triggers = [...new Set(allTrades.map((t) => t.emotion?.whatTriggeredIt).filter(Boolean))];

  const totals = days.reduce(
    (acc, d) => ({
      trades: acc.trades + d.trades,
      wins: acc.wins + d.wins,
      losses: acc.losses + d.losses,
      netR: acc.netR + d.netR,
      netPnl: acc.netPnl + d.netPnl,
    }),
    { trades: 0, wins: 0, losses: 0, netR: 0, netPnl: 0 }
  );

  const winRate = totals.trades ? (totals.wins / totals.trades) * 100 : null;
  const startBalance = days[0]?.accountBalance ?? account.startingBalance;
  const endBalance = days[days.length - 1]?.accountBalance ?? startBalance;

  let onTrackForTarget = null;
  if (account.profitTargetPercent) {
    const targetBalance = account.startingBalance * (1 + account.profitTargetPercent / 100);
    onTrackForTarget = endBalance >= targetBalance * 0.5 || totals.netR > 0;
  }

  const review = await prisma.weeklyReview.findUnique({
    where: { challengeAccountId_weekStarting: { challengeAccountId, weekStarting: start } },
  });

  return {
    account: { name: account.name, startingBalance: account.startingBalance, profitTargetPercent: account.profitTargetPercent, maxDrawdownPercent: account.maxDrawdownPercent },
    weekStarting: start,
    days,
    totals,
    winRate,
    startBalance,
    endBalance,
    onTrackForTarget: review?.onTrackForTarget ?? onTrackForTarget,
    reflection: review ?? null,
    urgeToBreakRulesCount,
    triggers,
  };
}

export async function getWeeklyRollup(req, res) {
  const data = await computeWeeklyRollup(req.userId, req.params.challengeAccountId, req.query.weekStarting);
  if (!data) return res.status(404).json({ error: 'Challenge account not found' });
  res.json(data);
}

export async function upsertWeeklyReview(req, res) {
  const { challengeAccountId } = req.params;
  const { weekStarting, whatWorkedThisWeek, whatDidntWork, oneChangeForNextWeek, onTrackForTarget } = req.body;

  const account = await prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId: req.userId } });
  if (!account) return res.status(404).json({ error: 'Challenge account not found' });

  const start = new Date(weekStarting);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);

  const review = await prisma.weeklyReview.upsert({
    where: { challengeAccountId_weekStarting: { challengeAccountId, weekStarting: start } },
    update: { whatWorkedThisWeek, whatDidntWork, oneChangeForNextWeek, onTrackForTarget },
    create: { challengeAccountId, weekStarting: start, weekEnding: end, whatWorkedThisWeek, whatDidntWork, oneChangeForNextWeek, onTrackForTarget },
  });

  res.json(review);
}
