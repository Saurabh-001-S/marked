import crypto from 'crypto';
import razorpay from '../config/razorpay.js';
import prisma from '../config/db.js';

// Kicks off a Razorpay subscription for the logged-in user and hands back
// what the frontend needs to open Razorpay Checkout. We do NOT flip the
// subscription to ACTIVE here — that only happens once the webhook confirms
// a real payment. A client-side "success" callback can be spoofed; a signed
// server-to-server webhook can't.
export async function createSubscription(req, res) {
  const planId = process.env.RAZORPAY_PLAN_ID_PRO;
  if (!planId) return res.status(500).json({ error: 'Billing is not configured yet — missing RAZORPAY_PLAN_ID_PRO' });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  const existing = await prisma.subscription.findUnique({ where: { userId: req.userId } });

  if (existing?.status === 'ACTIVE') {
    return res.status(400).json({ error: 'You already have an active subscription' });
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    total_count: 12, // 12 monthly cycles; Razorpay keeps auto-renewing within that window unless cancelled
    notes: { userId: req.userId },
  });

  // Store the Razorpay subscription id now so the webhook can match the
  // event back to this user without us having to look anything else up.
  await prisma.subscription.update({
    where: { userId: req.userId },
    data: { razorpaySubscriptionId: subscription.id },
  });

  res.json({
    subscriptionId: subscription.id,
    keyId: process.env.RAZORPAY_KEY_ID,
    prefill: { email: user.email, name: user.name },
  });
}

export async function getMySubscription(req, res) {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  if (!sub) return res.status(404).json({ error: 'No subscription record found' });
  res.json(sub);
}

// Used when a subscription is PAST_DUE — reopens Checkout against the SAME
// Razorpay subscription id rather than creating a new one, so Razorpay just
// completes the pending charge instead of starting a second, duplicate plan.
export async function retryPayment(req, res) {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  if (!sub?.razorpaySubscriptionId) {
    return res.status(400).json({ error: 'No subscription to retry payment for' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json({
    subscriptionId: sub.razorpaySubscriptionId,
    keyId: process.env.RAZORPAY_KEY_ID,
    prefill: { email: user.email, name: user.name },
  });
}

export async function cancelSubscription(req, res) {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  if (!sub?.razorpaySubscriptionId) {
    return res.status(400).json({ error: 'No active Razorpay subscription to cancel' });
  }
  await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId);
  await prisma.subscription.update({ where: { userId: req.userId }, data: { status: 'CANCELED' } });
  res.json({ ok: true });
}

const RAZORPAY_STATUS_MAP = {
  activated: 'ACTIVE',
  charged: 'ACTIVE',
  completed: 'ACTIVE',
  pending: 'PAST_DUE',
  halted: 'PAST_DUE',
  cancelled: 'CANCELED',
  expired: 'CANCELED',
};

// req.body arrives here as a raw Buffer, not parsed JSON — see the route
// wiring in index.js. Signature verification requires the exact raw bytes
// Razorpay signed; parsing it to an object first would make verification
// fail for reasons that are very annoying to debug in production.
export async function handleWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (signature !== expected) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = JSON.parse(req.body.toString());
  const subEntity = event.payload?.subscription?.entity;
  if (!subEntity) return res.json({ ok: true }); // event type we don't act on (e.g. payment.captured on its own)

  const dbSub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: subEntity.id } });
  if (!dbSub) return res.json({ ok: true }); // unknown subscription id — ack anyway so Razorpay stops retrying

  const newStatus = RAZORPAY_STATUS_MAP[subEntity.status] || dbSub.status;

  // A failed/pending charge doesn't cut access immediately — give the trader
  // a few days to fix their card before the paywall actually bites. Losing
  // access to a live journal mid-challenge over a declined card auto-renewal
  // is a bad way to lose a customer who was otherwise going to pay.
  const GRACE_PERIOD_DAYS = 3;
  let gracePeriodEndsAt = dbSub.gracePeriodEndsAt;
  if (newStatus === 'PAST_DUE' && dbSub.status !== 'PAST_DUE') {
    gracePeriodEndsAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  } else if (newStatus === 'ACTIVE' || newStatus === 'CANCELED') {
    gracePeriodEndsAt = null;
  }

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: newStatus,
      plan: newStatus === 'ACTIVE' ? 'PRO' : dbSub.plan,
      currentPeriodEnd: subEntity.current_end ? new Date(subEntity.current_end * 1000) : dbSub.currentPeriodEnd,
      gracePeriodEndsAt,
    },
  });

  res.json({ ok: true });
}
