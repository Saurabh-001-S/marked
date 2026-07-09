import prisma from '../config/db.js';
import { registerSetupTypeIfNew } from './setupPreferenceController.js';

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

  // Replace trades for this log wholesale — simpler and safer than diffing on every save
  await prisma.trade.deleteMany({ where: { dailyLogId: log.id } });
  if (trades.length) {
    await prisma.trade.createMany({
      data: trades.map((t, i) => ({ ...t, dailyLogId: log.id, tradeNumber: i + 1 })),
    });
    // Fire-and-forget-ish but awaited so a brand-new custom setup type is
    // guaranteed to exist by the time the user opens the Monthly page next.
    await Promise.all([...new Set(trades.map((t) => t.method).filter(Boolean))].map((m) => registerSetupTypeIfNew(req.userId, m)));
  }

  const full = await prisma.dailyLog.findUnique({
    where: { id: log.id },
    include: { trades: true, emotionLog: true },
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

// Used by the PDF export route — same lookup, but returns null instead of writing
// a 404 response so the caller can decide how to handle "no log yet" itself.
export async function fetchDailyLogWithAccount(userId, challengeAccountId, date) {
  const account = await prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId } });
  if (!account) return null;

  const log = await prisma.dailyLog.findUnique({
    where: { challengeAccountId_date: { challengeAccountId, date: new Date(date) } },
    include: { trades: { include: { emotion: true } }, emotionLog: true },
  });
  return { account, log };
}
