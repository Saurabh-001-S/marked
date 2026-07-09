import { Router } from 'express';
import { requireAuth, requireActiveSubscription } from '../middleware/auth.js';
import { upsertDailyLog, getDailyLog } from '../controllers/dailyLogController.js';
import { getWeeklyRollup, upsertWeeklyReview } from '../controllers/weeklyController.js';
import { getEmotionLog, upsertEmotionLog } from '../controllers/emotionController.js';
import { getMonthlyRollup, upsertMonthlyStat } from '../controllers/monthlyController.js';
import { upsertSetupPreference, listSetupPreferences } from '../controllers/setupPreferenceController.js';
import { exportDailyLogPdf, exportWeeklyPdf, exportMonthlyPdf } from '../controllers/pdfController.js';
import { getSnapshotUploadUrl } from '../controllers/uploadController.js';

const router = Router();
router.use(requireAuth, requireActiveSubscription);

router.put('/accounts/:challengeAccountId/daily-logs', upsertDailyLog);
router.post('/accounts/:challengeAccountId/snapshot-upload-url', getSnapshotUploadUrl);
router.get('/accounts/:challengeAccountId/daily-logs/:date', getDailyLog);
router.get('/accounts/:challengeAccountId/daily-logs/:date/emotion', getEmotionLog);
router.put('/accounts/:challengeAccountId/daily-logs/:date/emotion', upsertEmotionLog);
router.get('/accounts/:challengeAccountId/daily-logs/:date/pdf', exportDailyLogPdf);

router.get('/accounts/:challengeAccountId/weekly', getWeeklyRollup);
router.put('/accounts/:challengeAccountId/weekly', upsertWeeklyReview);
router.get('/accounts/:challengeAccountId/weekly/pdf', exportWeeklyPdf);

router.get('/accounts/:challengeAccountId/monthly', getMonthlyRollup);
router.put('/accounts/:challengeAccountId/monthly', upsertMonthlyStat);
router.get('/accounts/:challengeAccountId/monthly/pdf', exportMonthlyPdf);

router.get('/setup-preferences', listSetupPreferences);
router.put('/setup-preferences', upsertSetupPreference);

export default router;
