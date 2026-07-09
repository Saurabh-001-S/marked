# Deploying Marked — Local to Live

Follow this top to bottom. Each section assumes the previous one is done. Placeholders like `<your-username>` need your actual values.

---

## 0. Accounts you need before starting

Create these now — several take a few minutes to provision:

- [GitHub](https://github.com) — free
- [Neon](https://neon.tech) — Postgres, free tier
- [Render](https://render.com) — backend hosting, free tier
- [Vercel](https://vercel.com) — frontend hosting, free tier
- [Razorpay](https://razorpay.com) — payments, test mode is instant, live mode needs KYC (start that separately, it takes days)
- [Resend](https://resend.com) — transactional email, free tier (100 emails/day)

---

## 1. Run it locally first — don't skip this

If it doesn't work locally, it won't work deployed, and debugging is much harder once it's live.

```bash
unzip marked-scaffold.zip
cd marked
```

**Generate your JWT secrets** (run this twice, save both outputs):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Backend:**
```bash
cd server
cp .env.example .env
```
Open `.env` and fill in:
- `DATABASE_URL` — for now, use a free Neon database (see step 2 below) even for local dev, simplest to avoid installing Postgres locally
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — the two random strings you just generated
- `CLIENT_URL=http://localhost:5173`
- Leave Razorpay/Resend blank for now — the app degrades gracefully (emails print to console, billing routes error clearly if hit)

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```
Should print `Marked API running on port 5000`.

**Frontend** (new terminal):
```bash
cd marked/client
cp .env.example .env
```
Confirm `.env` has `VITE_API_URL=http://localhost:5000/api`

```bash
npm install
npm run dev
```
Open `http://localhost:5173` — register an account, create a challenge account, log a trade. If that all works, move on.

---

## 2. Production database (Neon)

1. Sign up at neon.tech, create a new project (any name/region).
2. On the project dashboard, copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
3. Paste this into `server/.env` as `DATABASE_URL` (replacing whatever was there for local dev — you can use the same Neon DB for both, it's fine at this scale).
4. Re-run migrations against it if you changed the connection string:
   ```bash
   cd server
   npx prisma migrate deploy
   ```

---

## 3. Push to GitHub

```bash
cd marked
git init
git add .
git commit -m "Initial commit"
```

Create a repo at github.com/new (don't initialize with a README — you already have files), then:
```bash
git remote add origin https://github.com/<your-username>/marked.git
git branch -M main
git push -u origin main
```

---

## 4. Deploy the backend (Render)

1. Render dashboard → **New +** → **Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npx prisma migrate deploy && npm start`
   - **Instance Type:** Free (fine to start; it spins down after 15 min idle and takes ~30s to wake up — upgrade to a paid instance once you have real users who'd notice that delay)
3. Add every environment variable from `server/.env.example`:
   - `DATABASE_URL` — your Neon connection string
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — same ones from step 1
   - `NODE_ENV=production` — **do not skip this**, the cookie security settings (httpOnly/secure/sameSite) branch on it
   - `CLIENT_URL` — leave a placeholder for now (`https://placeholder.vercel.app`), you'll update it in step 6
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID_PRO`, `RAZORPAY_WEBHOOK_SECRET` — from your Razorpay test-mode dashboard (Settings → API Keys; Subscriptions → Plans → Create Plan for the plan ID; webhook secret comes in step 7)
   - `RESEND_API_KEY`, `EMAIL_FROM` — from Resend dashboard
4. Deploy. Once live, copy your backend URL (e.g. `https://marked-api.onrender.com`).

---

## 5. Deploy the frontend (Vercel)

1. Vercel dashboard → **Add New** → **Project** → import the same GitHub repo.
2. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (should auto-detect)
3. Environment variable:
   - `VITE_API_URL` = `https://marked-api.onrender.com/api` (your actual Render URL + `/api`)
4. Deploy. Copy your frontend URL (e.g. `https://marked.vercel.app`).

---

## 6. Close the loop — update CORS

Go back to Render → your backend service → Environment → update `CLIENT_URL` to your real Vercel URL from step 5. Redeploy (Render usually does this automatically on env var save).

Without this, the browser will block every API request with a CORS error — the backend only allows requests from whatever `CLIENT_URL` says.

---

## 7. Razorpay webhook (test mode)

1. Razorpay Dashboard → Settings → Webhooks → **Add New Webhook**.
2. URL: `https://marked-api.onrender.com/api/billing/webhook` (your real Render URL)
3. Active events: `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`
4. Copy the generated **webhook secret** → paste into Render's `RAZORPAY_WEBHOOK_SECRET` env var → redeploy.

---

## 8. Test the whole thing end to end, in production, with fake money

1. Visit your live Vercel URL, register a real account.
2. Check your email (or Resend's dashboard logs) for the verification email.
3. Create a challenge account, log a trade, check the Weekly/Monthly pages compute correctly.
4. Click **Upgrade to Pro**. Use a Razorpay **test card**: `4111 1111 1111 1111`, any future expiry, any CVV.
5. Confirm the subscription badge flips to "Pro · Active" within a few seconds (this confirms the webhook is actually reaching your server — if it doesn't flip, check Render's logs and Razorpay Dashboard → Webhooks → your webhook → recent deliveries).

If this all works, your entire payment pipeline is proven correct **before** any real money is involved.

---

## 9. Custom domain (optional but recommended before real launch)

1. Buy a domain (Namecheap, Google Domains, GoDaddy — doesn't matter which).
2. In Vercel: Project → Settings → Domains → add your domain, follow the DNS instructions (usually an A record or CNAME at your registrar).
3. Optionally, point a subdomain like `api.yourdomain.com` at Render the same way, and update `VITE_API_URL` accordingly.
4. Update `CLIENT_URL` on Render and the Razorpay webhook URL to match your new domain once DNS propagates.

---

## 10. Going live with real payments

This is a business process, not a code change — start it early, it runs on its own clock:

1. Razorpay Dashboard → complete **KYC** (PAN/GST, bank account for settlement). Takes a few business days.
2. Once approved, Razorpay gives you **live mode** keys. Swap `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_PLAN_ID_PRO` on Render from test to live values.
3. Register a **second webhook** in live mode (test and live webhooks are separate) pointing at the same URL, get the live webhook secret, update `RAZORPAY_WEBHOOK_SECRET`.
4. Before announcing anything, run one real transaction yourself with a real card for a small amount to confirm live mode actually works — don't take Razorpay's word for it.
5. You'll also need to publish **Terms of Service**, **Privacy Policy**, and a **Refund/Cancellation Policy** — Razorpay requires links to these during KYC review, and it's genuinely necessary before taking anyone's money regardless.

---

## Quick reference — commands you'll run repeatedly

```bash
# Redeploy after code changes (Render/Vercel auto-deploy on git push if connected to GitHub)
git add .
git commit -m "describe the change"
git push

# Run a new migration after changing schema.prisma
cd server
npx prisma migrate dev --name describe_the_change   # locally, creates the migration
git push                                              # Render runs `prisma migrate deploy` automatically on the next deploy

# Check backend logs
# Render dashboard → your service → Logs tab

# Check frontend build errors
# Vercel dashboard → your project → Deployments → click the failed one → build logs
```
