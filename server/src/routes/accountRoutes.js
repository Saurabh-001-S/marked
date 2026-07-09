import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listAccounts, getAccount, createAccount } from '../controllers/accountController.js';

const router = Router();
router.use(requireAuth);

// Deliberately NOT behind requireActiveSubscription — a user on an expired
// trial should still be able to see their accounts and hit the paywall
// naturally when they try to open a daily log, not be locked out of the app shell entirely.
router.get('/accounts', listAccounts);
router.get('/accounts/:challengeAccountId', getAccount);
router.post('/accounts', createAccount);

export default router;
