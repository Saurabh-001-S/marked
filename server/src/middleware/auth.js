import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Blocks access to paid features unless subscription is ACTIVE, still within
// an unexpired TRIAL, or PAST_DUE but still inside its grace period (a failed
// renewal charge shouldn't lock someone out instantly — see billingController
// for where the grace period gets set).
export async function requireActiveSubscription(req, res, next) {
  const prisma = (await import('../config/db.js')).default;
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  if (!sub) return res.status(402).json({ error: 'Subscription required', code: 'SUBSCRIPTION_REQUIRED' });

  const now = new Date();
  const trialExpired = sub.status === 'TRIAL' && sub.currentPeriodEnd && now > sub.currentPeriodEnd;
  const inGracePeriod = sub.status === 'PAST_DUE' && sub.gracePeriodEndsAt && now < sub.gracePeriodEndsAt;

  const allowed = sub.status === 'ACTIVE' || (sub.status === 'TRIAL' && !trialExpired) || inGracePeriod;

  if (!allowed) {
    const message = sub.status === 'PAST_DUE'
      ? 'Your payment failed and the grace period has ended — update your payment method to keep journaling'
      : 'Your trial has ended — upgrade to keep journaling';
    return res.status(402).json({ error: message, code: 'SUBSCRIPTION_REQUIRED' });
  }
  next();
}
