# Marked — Trading Journal for Funded Challenges

PERN stack (Postgres, Express, React, Node). Two workspaces: `server` (API) and `client` (frontend).

## Stack decisions
- **DB:** PostgreSQL + Prisma ORM — relational data (users → subscriptions → daily logs → trades → weekly/monthly rollups), heavy on aggregation reporting, and billing needs ACID transactions.
- **Auth:** JWT (access + refresh token), bcrypt for passwords.
- **Payments:** Razorpay Subscriptions (India-first).
- **Frontend:** React + Vite + Tailwind, React Router, React Query for API state.
- **Hosting plan:** Vercel (client) + Render/Railway (server) + Neon or Railway Postgres.

## Local setup

### 1. Database
Install Postgres locally, or use a free Neon.tech / Railway Postgres instance (recommended — no local install needed).

### 2. Server
```
cd server
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, RAZORPAY keys
npm install
npx prisma migrate dev --name init
npm run dev
```
Server runs on http://localhost:5000

> Schema has changed twice since `init`: once to add challenge parameters (`profitTargetPercent`, `maxDrawdownPercent`, `minTradingDays`) and once to add email verification/password reset fields plus the billing grace period field. Run `npx prisma migrate dev --name add-billing-and-auth-fields` after pulling the latest schema.

> **Prisma 7 note:** this project targets Prisma 7, which moved the database connection URL out of `schema.prisma` entirely. If your editor ever shows "the datasource property `url` is no longer supported in schema files" again after editing the schema, that's Prisma correctly telling you not to put a `url` line back in the `datasource` block — the connection string lives in two places now: `server/prisma.config.mjs` (used by CLI commands like `migrate`/`generate`) and `server/src/config/db.js` (used by the running server, via a Postgres driver adapter). Both read from the same `DATABASE_URL` env var, so you only ever set it once in `.env`. The config file is plain `.mjs`, not `.ts` — Prisma 7's TypeScript config loader has a known bug (`createJiti` export error) in early releases; plain JS sidesteps it.

### 3. Client
```
cd client
cp .env.example .env      # set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```
Client runs on http://localhost:5173

## Folder structure
```
marked/
  server/
    prisma/schema.prisma       <- DB schema (source of truth)
    src/
      config/                  <- db client, env loading
      controllers/              <- request handlers
      routes/                   <- express routers
      middleware/                <- auth, error handling
      index.js                   <- app entry
  client/
    src/
      pages/                    <- DailyLog, Emotion, Weekly, Monthly, Reports, Landing
      components/                <- shared UI
      api/                       <- axios instance + API calls
      context/                   <- auth context
```

## Build order (recommended)
1. Prisma schema (all tables) — reviewed and locked before writing routes
2. Auth (register/login/JWT middleware)
3. Daily Log CRUD (the core loop)
4. Weekly/Monthly rollup queries (computed from daily logs, not re-entered)
5. Razorpay subscription + paywall middleware
6. Reports (PDF export)
7. India Markets widget (read-only, cached from a market data API)

## Razorpay setup (required before billing works)

1. Create a Razorpay account (test mode is fine for development) and grab your `Key ID` / `Key Secret` from Settings → API Keys.
2. Create a **Plan** for the Pro tier: Dashboard → Subscriptions → Plans → Create Plan. ₹499/month, matches the pricing page. Copy the resulting `plan_id` into `RAZORPAY_PLAN_ID_PRO`.
3. Set up a **Webhook**: Dashboard → Settings → Webhooks → Add New Webhook.
   - URL: `https://<your-deployed-server>/api/billing/webhook` (must be publicly reachable — use `ngrok` for local testing, Razorpay can't hit `localhost`)
   - Active events: `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`
   - Copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`
4. Fill in all four Razorpay env vars in `server/.env`.

**Why the webhook matters:** the frontend's Razorpay Checkout `handler` callback fires in the user's browser and can be spoofed or interrupted (closed tab, network drop). The subscription only actually flips to `ACTIVE` in the database when the signed webhook arrives from Razorpay's servers — that's the only event source this app trusts for billing state. Don't be tempted to activate on the client-side callback alone; it's the difference between "free trick to unlock Pro" and an actual paywall.

**Testing without real money:** Razorpay's test mode gives you test card numbers (4111 1111 1111 1111, any future expiry/CVV) that go through the full flow without charging anything. Use `ngrok http 5000` to expose your local server so Razorpay's test webhooks can reach it.
