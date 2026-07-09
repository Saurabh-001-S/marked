import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../config/db.js';
import { sendEmail, verificationEmailHtml, passwordResetEmailHtml } from '../services/emailService.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
});

const isProd = process.env.NODE_ENV === 'production';

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}
function signRefreshToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
}
function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Sets the refresh token as an httpOnly cookie (unreadable by JS — the main
// point of this whole change) scoped narrowly to /api/auth since that's the
// only place it's ever needed, plus a separate, JS-readable csrfToken cookie
// used for the double-submit CSRF check on every other mutating request.
// sameSite:'none' is required for a cross-origin client+API split in
// production, which requires secure:true (HTTPS) to go with it — that's
// exactly why this branches on isProd rather than just hardcoding 'none'.
function setAuthCookies(res, userId) {
  const refreshToken = signRefreshToken(userId);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  const csrfToken = randomToken();
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.clearCookie('csrfToken');
}

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = randomToken();

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      verificationToken,
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      subscription: { create: { plan: 'STARTER', status: 'TRIAL', currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) } },
    },
  });

  sendEmail({
    to: user.email,
    subject: 'Confirm your email — Marked',
    html: verificationEmailHtml(`${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`),
  }).catch((err) => console.error('Failed to send verification email:', err));

  setAuthCookies(res, user.id);
  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified },
    accessToken: signAccessToken(user.id),
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  setAuthCookies(res, user.id);
  res.json({
    user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified },
    accessToken: signAccessToken(user.id),
  });
}

export async function getMe(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

// Reads the refresh token from the httpOnly cookie, not the request body —
// there's nothing in localStorage anymore for a client to send. Rotates the
// refresh token on every call (re-issues the cookie), which limits how long
// a leaked token stays valid if it's ever intercepted mid-flight, even
// though there's still no server-side revocation list for a token that's
// leaked at rest.
export async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'Missing refresh token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    setAuthCookies(res, payload.sub);
    res.json({ accessToken: signAccessToken(payload.sub) });
  } catch {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

export async function logout(req, res) {
  clearAuthCookies(res);
  res.json({ ok: true });
}

export async function verifyEmail(req, res) {
  const { token } = req.body;
  const user = await prisma.user.findUnique({ where: { verificationToken: token } });

  if (!user || !user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
    return res.status(400).json({ error: 'This verification link is invalid or has expired' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null, verificationTokenExpiry: null },
  });

  res.json({ ok: true });
}

export async function resendVerification(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (user.emailVerified) return res.status(400).json({ error: 'Email is already verified' });

  const verificationToken = randomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken, verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  await sendEmail({
    to: user.email,
    subject: 'Confirm your email — Marked',
    html: verificationEmailHtml(`${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`),
  });

  res.json({ ok: true });
}

// Deliberately returns the same response whether or not the email exists —
// confirming an email's existence to an unauthenticated caller is a small
// but real account-enumeration leak.
export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const passwordResetToken = randomToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken, passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await sendEmail({
      to: user.email,
      subject: 'Reset your Marked password',
      html: passwordResetEmailHtml(`${process.env.CLIENT_URL}/reset-password?token=${passwordResetToken}`),
    });
  }

  res.json({ ok: true, message: 'If that email has an account, a reset link is on its way.' });
}

export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });
  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
  });

  res.json({ ok: true });
}
