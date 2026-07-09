import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import journalRoutes from './routes/journalRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import { handleWebhook } from './controllers/billingController.js';

const app = express();

// credentials:true is required for the browser to send/receive the httpOnly
// refresh-token cookie cross-origin; origin must be an explicit URL (not '*')
// for that to work at all — the two go together.
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// IMPORTANT: the Razorpay webhook needs the raw request body to verify the
// HMAC signature, so it's registered here — before the global express.json()
// below — with its own raw parser. If express.json() ran first, req.body
// would already be a parsed object by the time it got here and signature
// verification would fail every single time.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api', accountRoutes);
app.use('/api', journalRoutes);
app.use('/api', billingRoutes);

// Central error handler — keeps controllers free of try/catch boilerplate
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Marked API running on port ${port}`));
