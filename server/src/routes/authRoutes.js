import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  register, login, refresh, logout, getMe,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
} from '../controllers/authController.js';

const router = Router();

// No CSRF on register/login/forgot/reset/verify — there's no existing
// session cookie for an attacker to ride on for any of these, so the
// double-submit check has nothing to protect yet.
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

// Refresh reads the httpOnly cookie directly and isn't behind requireAuth
// (the access token being expired is exactly why this gets called), but it
// DOES still need CSRF protection since it mutates the session.
router.post('/refresh', csrfProtection, refresh);
router.post('/logout', requireAuth, csrfProtection, logout);

router.get('/me', requireAuth, getMe);
router.post('/resend-verification', requireAuth, csrfProtection, resendVerification);

export default router;
