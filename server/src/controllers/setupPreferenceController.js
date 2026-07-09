import prisma from '../config/db.js';

// These match the five setup types from the original paper template. Any
// custom type a user types into a trade's Method field gets folded in here
// too — see the update at the bottom — so the dropdown always reflects what
// they've actually used, not just the defaults.
const DEFAULT_SETUP_TYPES = [
  'COT High/Low Sweep',
  'VP POC Rejection',
  'VAH / VAL Reversal',
  'HVN / LVN Reaction',
  'Delta / Footprint Signal',
];

export async function listSetupPreferences(req, res) {
  const prefs = await prisma.setupPreference.findMany({ where: { userId: req.userId } });
  const map = new Map(prefs.map((p) => [p.setupType, p.decision]));
  for (const type of DEFAULT_SETUP_TYPES) {
    if (!map.has(type)) map.set(type, 'UNDECIDED');
  }
  res.json([...map.entries()].map(([setupType, decision]) => ({ setupType, decision })));
}

export async function upsertSetupPreference(req, res) {
  const { setupType, decision } = req.body;
  if (!setupType || !['KEEP', 'DROP', 'UNDECIDED'].includes(decision)) {
    return res.status(400).json({ error: 'setupType and a valid decision (KEEP/DROP/UNDECIDED) are required' });
  }
  const pref = await prisma.setupPreference.upsert({
    where: { userId_setupType: { userId: req.userId, setupType } },
    update: { decision },
    create: { userId: req.userId, setupType, decision },
  });
  res.json(pref);
}

// Called when a trade is saved with a Method that isn't in the known list yet
// (see dailyLogController) — registers it as UNDECIDED so it shows up in
// future dropdowns and the monthly breakdown without a manual step.
export async function registerSetupTypeIfNew(userId, setupType) {
  if (!setupType) return;
  const existing = await prisma.setupPreference.findUnique({ where: { userId_setupType: { userId, setupType } } });
  if (!existing && !DEFAULT_SETUP_TYPES.includes(setupType)) {
    await prisma.setupPreference.create({ data: { userId, setupType, decision: 'UNDECIDED' } });
  }
}
