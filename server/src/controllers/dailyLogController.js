import prisma from '../config/db.js';
import { registerSetupTypeIfNew } from './setupPreferenceController.js';

// Only these are real, writable scalar columns on Trade. Everything else
// that might arrive in a trade object from the client — id, emotion (a
// relation, not a scalar), createdAt, etc. — is dropped here rather than
// trusted, since the frontend often echoes back whatever it last fetched
// (which includes server-added fields) rather than only what changed.
const TRADE_WRITABLE_FIELDS = [
  'time', 'direction', 'entry', 'stopLoss', 'takeProfit', 'lotSize',
  'riskReward', 'method', 'cotSignal', 'resultR', 'outcome', 'pnl',
  'setupDescription', 'domConfirmation', 'chartSnapshotUrl', 'followedPlan',
];
function sanitizeTrade(t) {
  return Object.fromEntries(
    TRADE_WRITABLE_FIELDS.filter((key) => key in t).map((key) => [key, t[key]])
  );
}

// Creates or updates a daily log for a given challenge account + date, including nested trades.
// Upsert pattern because "Save Day" in the UI should work whether the log exists yet or not.
export async function upsertDailyLog(req, res) {
  const { challengeAccountId } = req.params;
  const { date, accountBalance, dayNumberInChallenge, newsEvents, preSessionBiasHtf, keyVpLevels, trades = [], endOfDay = {} } = req.body;

  // Ownership check — never trust the route param alone
  const account = await prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId: req.userId } });
  if (!account) return res.status(404).json({ error: 'Challenge account not found' });

  const log = await prisma.dailyLog.upsert({
    where: { challengeAccountId_date: { challengeAccountId, date: new Date(date) } },
    update: {
      accountBalance, dayNumberInChallenge, newsEvents, preSessionBiasHtf, keyVpLevels,
      ...endOfDay,
    },
    create: {
      challengeAccountId,
      date: new Date(date),
      accountBalance, dayNumberInChallenge, newsEvents, preSessionBiasHtf, keyVpLevels,
      ...endOfDay,
    },
  });

  // Upsert trades by tradeNumber instead of delete-all-and-recreate.
  // Recreating trades on every save generated new trade IDs each time,
  // which silently cascade-deleted any TradeEmotion rows attached to the
  // old ones — a bug that was tolerable when emotion was rarely edited,
  // but not now that it lives directly on the trade card and gets touched
  // on nearly every save.
  const existingTrades = await prisma.trade.findMany({ where: { dailyLogId: log.id } });
  const incomingNumbers = trades.map((_, i) => i + 1);
  const toDelete = existingTrades.filter((et) => !incomingNumbers.includes(et.tradeNumber));
  if (toDelete.length) {
    await prisma.trade.deleteMany({ where: { id: { in: toDelete.map((t) => t.id) } } });
  }

  if (trades.length) {
    await Promise.all(
      trades.map((t, i) => {
        const tradeNumber = i + 1;
        const data = sanitizeTrade(t);
        return prisma.trade.upsert({
          where: { dailyLogId_tradeNumber: { dailyLogId: log.id, tradeNumber } },
          update: data,
          create: { ...data, dailyLogId: log.id, tradeNumber },
        });
      })
    );
    // Fire-and-forget-ish but awaited so a brand-new custom setup type is
    // guaranteed to exist by the time the user opens the Monthly page next.
    await Promise.all([...new Set(trades.map((t) => t.method).filter(Boolean))].map((m) => registerSetupTypeIfNew(req.userId, m)));
  }

  const full = await prisma.dailyLog.findUnique({
    where: { id: log.id },
    include: { trades: { include: { emotion: true } }, emotionLog: true },
  });
  res.json(full);
}

export async function getDailyLog(req, res) {
  const { challengeAccountId, date } = req.params;
  const account = await prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId: req.userId } });
  if (!account) return res.status(404).json({ error: 'Challenge account not found' });

  const log = await prisma.dailyLog.findUnique({
    where: { challengeAccountId_date: { challengeAccountId, date: new Date(date) } },
    include: { trades: { include: { emotion: true } }, emotionLog: true },
  });
  if (!log) return res.status(404).json({ error: 'No log for this date yet' });
  res.json(log);
}

// Used by the PDF export route — same lookup, but returns null instead of
// writing a 404 response so the caller can decide how to handle "no log
// yet" itself.
export async function fetchDailyLogWithAccount(userId, challengeAccountId, date) {
  const account = await prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId } });
  if (!account) return null;

  const log = await prisma.dailyLog.findUnique({
    where: { challengeAccountId_date: { challengeAccountId, date: new Date(date) } },
    include: { trades: { include: { emotion: true } }, emotionLog: true },
  });
  return { account, log };
}
