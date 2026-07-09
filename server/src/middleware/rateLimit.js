import rateLimit from 'express-rate-limit';

// Login: brute-force protection. 10 attempts per 15 minutes per IP is tight
// enough to make password-guessing impractical without punishing someone
// who just fat-fingered their password a few times.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — please wait a few minutes and try again.' },
});

// Registration: spam/abuse protection, looser than login since it's a much
// less sensitive action and false positives (e.g. shared office IP) are more
// annoying here.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this network — please try again later.' },
});

// Forgot-password: without this, someone could hammer the endpoint to spam
// a target's inbox with reset emails, or use response timing to enumerate
// which emails have accounts.
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests — please wait and try again later.' },
});
