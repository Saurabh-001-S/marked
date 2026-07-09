import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createSubscription, getMySubscription, cancelSubscription, retryPayment } from '../controllers/billingController.js';

const router = Router();
router.use(requireAuth);

router.get('/billing/subscription', getMySubscription);
router.post('/billing/subscribe', createSubscription);
router.post('/billing/retry', retryPayment);
router.post('/billing/cancel', cancelSubscription);

export default router;
