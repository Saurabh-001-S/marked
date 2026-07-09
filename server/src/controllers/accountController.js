import prisma from '../config/db.js';

export async function listAccounts(req, res) {
  const accounts = await prisma.challengeAccount.findMany({
    where: { userId: req.userId, archived: false },
    orderBy: { createdAt: 'desc' },
  });
  res.json(accounts);
}

export async function getAccount(req, res) {
  const account = await prisma.challengeAccount.findFirst({
    where: { id: req.params.challengeAccountId, userId: req.userId },
  });
  if (!account) return res.status(404).json({ error: 'Challenge account not found' });
  res.json(account);
}

export async function createAccount(req, res) {
  const { name, startingBalance, profitTargetPercent, maxDrawdownPercent, minTradingDays } = req.body;
  if (!name || !startingBalance) {
    return res.status(400).json({ error: 'name and startingBalance are required' });
  }
  const account = await prisma.challengeAccount.create({
    data: {
      userId: req.userId,
      name,
      startingBalance: Number(startingBalance),
      profitTargetPercent: profitTargetPercent ? Number(profitTargetPercent) : null,
      maxDrawdownPercent: maxDrawdownPercent ? Number(maxDrawdownPercent) : null,
      minTradingDays: minTradingDays ? Number(minTradingDays) : null,
    },
  });
  res.status(201).json(account);
}
