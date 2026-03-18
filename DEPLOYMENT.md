# Arsenal Analytics — Deployment Guide

## Stack
- **Frontend (Web App)**: Next.js 15 → [Vercel](https://vercel.com)
- **Backend (Database + Services)**: PostgreSQL + cron → [Railway](https://railway.app)
- **Email**: Resend (free tier: 3,000 emails/month)
- **Payments**: Stripe (optional — only needed for online invoice payments)

---

## 1. Database — Railway

### Create a PostgreSQL instance

1. Create a free account at [railway.app](https://railway.app)
2. Create a new project → click **+ New** → **Database** → **PostgreSQL**
3. Once provisioned, open the database service → **Variables** tab
4. Copy the `DATABASE_URL` connection string (it already includes `?sslmode=require`)

```
postgresql://postgres:password@roundhouse.proxy.rlwy.net:PORT/railway
```

### Install the Railway CLI (optional but recommended)

```bash
npm i -g @railway/cli
railway login
railway link   # link this repo to your Railway project
```

### Run migrations

Use the public Railway URL (visible under the database service → **Connect** tab).
The internal `postgres.railway.internal` hostname is only reachable from within Railway's private network.

```bash
DATABASE_URL="<your-public-railway-url>" npx prisma@6 migrate deploy --schema packages/db/prisma/schema.prisma
```

> **Note**: Pin to `prisma@6` — the project is not compatible with Prisma 7, which changed how connection URLs are configured. Without the version pin `npx` may resolve to Prisma 7 and fail.

### Seed demo data (staging only)

```bash
DATABASE_URL="<your-public-railway-url>" SEED_PASSWORD="ChooseAStrongPassword" pnpm db:seed
```

This creates a demo org **Skyline Aviation Services** with 6 users, customers, aircraft, and work orders.
All users sign in with the `SEED_PASSWORD` you set.

| Email | Role |
|-------|------|
| admin@skylineaviation.com | Owner |
| manager@skylineaviation.com | Manager |
| billing@skylineaviation.com | Accountant |
| jsmith@skylineaviation.com | Technician |

### Cron snapshot job (optional)

The `/api/cron/snapshot` endpoint creates FP&A and cash-flow snapshots. To run it on a schedule in Railway:

1. In your Railway project → **+ New** → **Empty Service**
2. Set the start command:
   ```
   curl -X POST https://your-domain.vercel.app/api/cron/snapshot -H "Authorization: Bearer $CRON_SECRET"
   ```
3. Under **Settings → Cron Schedule**, set `0 2 * * *` (daily at 2 AM UTC)
4. Add `CRON_SECRET` as a variable in both the Railway cron service and your Vercel project

---

## 2. Email — Resend

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your sending domain
3. Create an API key → save as `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to a verified address on that domain

The app sends: quote approvals, invoice links, invite emails, password resets.
Without `RESEND_API_KEY`, all emails fall back to `console.log` (safe for development).

---

## 3. Vercel Deployment (Frontend)

### First-time setup

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your Vercel project from the repo root
vercel link

# Set environment variables
vercel env add DATABASE_URL              # your Railway PostgreSQL URL
vercel env add AUTH_SECRET               # openssl rand -base64 32
vercel env add AUTH_URL                  # https://your-domain.vercel.app
vercel env add NEXT_PUBLIC_APP_URL
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL
```

### Deploy

```bash
vercel --prod
```

### Environment variable checklist

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Railway PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Random 32-byte secret for session signing |
| `AUTH_URL` | ✅ | Full app URL (https://...) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same as AUTH_URL |
| `RESEND_API_KEY` | Recommended | Email delivery |
| `RESEND_FROM_EMAIL` | Recommended | Verified sender address |
| `STRIPE_SECRET_KEY` | Optional | Online invoice payments |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook validation |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Client-side Stripe |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob file uploads |
| `CRON_SECRET` | Optional | Secures cron endpoint called from Railway |

---

## 4. GitHub Actions CI/CD (optional)

Required GitHub secrets:

```
VERCEL_TOKEN          — from vercel.com/account/tokens
VERCEL_ORG_ID         — from .vercel/project.json after vercel link
VERCEL_PROJECT_ID     — from .vercel/project.json after vercel link
DATABASE_URL          — Railway production DB URL (for migrate deploy)
```

Branch strategy:
- `main` → production (auto-deploys to Vercel, runs `prisma migrate deploy`)
- `staging` → staging preview (auto-deploys to Vercel)
- feature branches → no auto-deploy

To run migrations automatically on deploy, add this step to your workflow before the Vercel deploy step:

```yaml
- name: Run DB migrations
  run: npx prisma@6 migrate deploy --schema packages/db/prisma/schema.prisma
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## 5. Stripe Webhook (production only)

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
3. Select event: `checkout.session.completed`
4. Copy the webhook signing secret → save as `STRIPE_WEBHOOK_SECRET`

---

## 6. First Login

After deploying and migrating, either:
- **Use seeded demo data** (staging): sign in with `admin@skylineaviation.com` + your `SEED_PASSWORD`
- **Create a fresh account** (production): go to `/sign-up` and register your shop

From the Owner account, go to **Settings → User Management** to invite your team.
