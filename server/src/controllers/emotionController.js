import prisma from '../config/db.js';

async function getOwnedAccount(userId, challengeAccountId) {
  return prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId } });
}

export async function getEmotionLog(req, res) {
  const { challengeAccountId, date } = req.params;
  const account = await getOwnedAccount(req.userId, challengeAccountId);
  if (!account) return res.status(404).json({ error: 'Challenge account not found' });

  const dailyLog = await prisma.dailyLog.findUnique({
    where: { challengeAccountId_date: { challengeAccountId, date: new Date(date) } },
    include: { emotionLog: true, trades: { include: { emotion: true }, orderBy: { tradeNumber: 'asc' } } },
  });

  if (!dailyLog) return res.json({ emotionLog: null, trades: [] });
  res.json({ emotionLog: dailyLog.emotionLog, trades: dailyLog.trades });
}

export async function upsertEmotionLog(req, res) {
  const { challengeAccountId, date } = req.params;
  const account = await getOwnedAccount(req.userId, challengeAccountId);
  if (!account) return res.status(404).json({ error: 'Challenge account not found' });

  // A trader might log their pre-session state before taking any trades,
  // so the daily log row needs to exist even if the Daily Log page hasn't been saved yet.
  let dailyLog = await prisma.dailyLog.findUnique({
    where: { challengeAccountId_date: { challengeAccountId, date: new Date(date) } },
  });
  if (!dailyLog) {
    dailyLog = await prisma.dailyLog.create({
      data: { challengeAccountId, date: new Date(date), accountBalance: 0 },
    });
  }

  const { preSession = {}, postSession = {}, disciplineChecklist = {}, tradeEmotions = [] } = req.body;

  const emotionLog = await prisma.emotionLog.upsert({
    where: { dailyLogId: dailyLog.id },
    update: { ...preSession, ...postSession, disciplineChecklist },
    create: { dailyLogId: dailyLog.id, ...preSession, ...postSession, disciplineChecklist },
  });

  const trades = await prisma.trade.findMany({ where: { dailyLogId: dailyLog.id } });
  for (const te of tradeEmotions) {
    const { tradeNumber, ...emotionFields } = te;
    const trade = trades.find((t) => t.tradeNumber === tradeNumber);
    if (!trade) continue; // trade doesn't exist yet — nothing to attach emotion to
    await prisma.tradeEmotion.upsert({
      where: { tradeId: trade.id },
      update: emotionFields,
      create: { tradeId: trade.id, ...emotionFields },
    });
  }

  const tradesWithEmotion = await prisma.trade.findMany({
    where: { dailyLogId: dailyLog.id },
    include: { emotion: true },
    orderBy: { tradeNumber: 'asc' },
  });

  res.json({ emotionLog, trades: tradesWithEmotion });
}
