import { fetchDailyLogWithAccount } from './dailyLogController.js';
import { computeWeeklyRollup } from './weeklyController.js';
import { computeMonthlyRollup } from './monthlyController.js';
import { startPdf, renderDailyLogPdf, renderWeeklyPdf, renderMonthlyPdf } from '../services/pdfService.js';

export async function exportDailyLogPdf(req, res) {
  const { challengeAccountId, date } = req.params;
  const result = await fetchDailyLogWithAccount(req.userId, challengeAccountId, date);
  if (!result) return res.status(404).json({ error: 'Challenge account not found' });

  const doc = startPdf(res, `daily-log-${date}.pdf`);
  await renderDailyLogPdf(doc, { account: result.account, log: result.log, date });
  doc.end();
}

export async function exportWeeklyPdf(req, res) {
  const { challengeAccountId } = req.params;
  const data = await computeWeeklyRollup(req.userId, challengeAccountId, req.query.weekStarting);
  if (!data) return res.status(404).json({ error: 'Challenge account not found' });

  const doc = startPdf(res, `weekly-review-${req.query.weekStarting}.pdf`);
  renderWeeklyPdf(doc, data);
  doc.end();
}

export async function exportMonthlyPdf(req, res) {
  const { challengeAccountId } = req.params;
  const data = await computeMonthlyRollup(req.userId, challengeAccountId, req.query.month);
  if (!data) return res.status(404).json({ error: 'Challenge account not found' });

  const doc = startPdf(res, `monthly-stats-${req.query.month}.pdf`);
  renderMonthlyPdf(doc, data);
  doc.end();
}
