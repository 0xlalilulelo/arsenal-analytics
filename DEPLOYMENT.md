# Arsenal Analytics — Deployment Guide

## Stack
- **App**: Next.js 15 (deployed to Vercel)
- **Database**: PostgreSQL (Neon recommended — serverless, free tier available)
- **Email**: Resend (free tier: 3,000 emails/month)
- **Payments**: Stripe (optional — only needed for online invoice payments)

---

## 1. Database — Neon (recommended)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project → copy the **Connection string** (pooled)
3. Save it as `DATABASE_URL` in your environment

```
postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Run migrations
```bash
DATABASE_URL="<your-neon-url>" npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

### Seed demo data (staging only)
```bash
DATABASE_URL="<your-neon-url>" SEED_PASSWORD="ChooseAStrongPassword" pnpm db:seed
```
This creates a demo org **Skyline Aviation Services** with 6 users, customers, aircraft, and work orders.
All users sign in with the `SEED_PASSWORD` you set.

| Email | Role |
|-------|------|
| admin@skylineaviation.com | Owner |
| manager@skylineaviation.com | Manager |
| billing@skylineaviation.com | Accountant |
| jsmith@skylineaviation.com | Technician |

---

## 2. Email — Resend

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your sending domain
3. Create an API key → save as `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to a verified address on that domain

The app sends: quote approvals, invoice links, invite emails, password resets.
Without `RESEND_API_KEY`, all emails fall back to `console.log` (safe for development).

---

## 3. Vercel Deployment

### First-time setup
```bash
# Install Vercel CLI
npm i -g vercel

# Link to your Vercel project from the repo root
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add AUTH_SECRET        # openssl rand -base64 32
vercel env add AUTH_URL           # https://your-domain.vercel.app
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
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Random 32-byte secret for session signing |
| `AUTH_URL` | ✅ | Full app URL (https://...) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same as AUTH_URL |
| `RESEND_API_KEY` | Recommended | Email delivery |
| `RESEND_FROM_EMAIL` | Recommended | Verified sender address |
| `STRIPE_SECRET_KEY` | Optional | Online invoice payments |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook validation |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Client-side Stripe |

---

## 4. GitHub Actions CI/CD (optional)

Required GitHub secrets:
```
VERCEL_TOKEN          — from vercel.com/account/tokens
VERCEL_ORG_ID         — from .vercel/project.json after vercel link
VERCEL_PROJECT_ID     — from .vercel/project.json after vercel link
DATABASE_URL          — production DB URL (for migrate deploy)
```

Branch strategy:
- `main` → production (auto-deploys, runs `prisma migrate deploy`)
- `staging` → staging preview (auto-deploys)
- feature branches → no auto-deploy

---

## 5. Stripe Webhook (production only)

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select event: `checkout.session.completed`
4. Copy the webhook signing secret → save as `STRIPE_WEBHOOK_SECRET`

---

## 6. First Login

After deploying and migrating, either:
- **Use seeded demo data** (staging): sign in with `admin@skylineaviation.com` + your `SEED_PASSWORD`
- **Create a fresh account** (production): go to `/sign-up` and register your shop

From the Owner account, go to **Settings → User Management** to invite your team.
