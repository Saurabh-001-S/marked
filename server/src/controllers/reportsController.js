import prisma from '../config/db.js';

// Powers the Reports page — counts for the three stat cards, plus a short
// list of recent daily logs so the "quick pick" buttons and table don't
// need three separate round trips.
export async function getReportsSummary(req, res) {
  const { challengeAccountId } = req.params;

  const account = await prisma.challengeAccount.findFirst({
    where: { id: challengeAccountId, userId: req.userId },
  });
  if (!account) return res.status(404).json({ error: 'Challenge account not found' });

  const [dailyLogCount, weeklyReviewCount, monthlyRecordCount, recentDailyLogs] = await Promise.all([
    prisma.dailyLog.count({ where: { challengeAccountId } }),
    prisma.weeklyReview.count({ where: { challengeAccountId } }),
    prisma.monthlyStat.count({ where: { challengeAccountId } }),
    prisma.dailyLog.findMany({
      where: { challengeAccountId },
      orderBy: { date: 'desc' },
      take: 10,
      select: { date: true, accountBalance: true },
    }),
  ]);

  res.json({ dailyLogCount, weeklyReviewCount, monthlyRecordCount, recentDailyLogs });
}