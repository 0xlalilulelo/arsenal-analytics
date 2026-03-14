# Arsenal Analytics — Setup & Deployment Guide

End-to-end guide covering local development, staging, production deployment, and
onboarding your first partner customer.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Development Environment (Shared Dev Server)](#development-environment)
4. [Staging](#staging)
5. [Production Deployment](#production-deployment)
6. [First Partner Customer Onboarding](#first-partner-customer-onboarding)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 | `node --version` |
| pnpm | 9.x | `npm install -g pnpm@9` |
| PostgreSQL | ≥ 15 | Local: see Docker option below |
| Git | any | |

---

## Local Development

### 1. Clone and install

```bash
git clone <repo-url> arsenal-analytics
cd arsenal-analytics
pnpm install
```

### 2. Start a local PostgreSQL database

**Option A — Docker (recommended)**

```bash
docker run -d \
  --name arsenal-db \
  -e POSTGRES_USER=arsenal \
  -e POSTGRES_PASSWORD=arsenal_dev \
  -e POSTGRES_DB=arsenal_analytics \
  -p 5432:5432 \
  postgres:16
```

**Option B — Homebrew (macOS)**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb arsenal_analytics
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your local values:

```env
DATABASE_URL="postgresql://arsenal:arsenal_dev@localhost:5432/arsenal_analytics"
AUTH_SECRET="<run: openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
SEED_PASSWORD="Arsenal2025!"

# Optional for local dev — stubs used when absent:
# RESEND_API_KEY=         → emails logged to console
# BLOB_READ_WRITE_TOKEN=  → uploads return stub URLs
# STRIPE_SECRET_KEY=      → Stripe checkout returns 503
```

### 4. Run migrations and seed

```bash
pnpm db:migrate      # applies all Prisma migrations
pnpm db:seed         # loads demo org, users, customers, WOs, invoices
```

### 5. Start the dev server

```bash
pnpm dev             # starts Next.js on http://localhost:3000
```

### 6. Log in with seed credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | admin@skylineaviation.com | Arsenal2025! |
| Manager | manager@skylineaviation.com | Arsenal2025! |
| Accountant | billing@skylineaviation.com | Arsenal2025! |
| Technician | jsmith@skylineaviation.com | Arsenal2025! |

### 7. Run tests

```bash
pnpm --filter @mro/web test          # run once
pnpm --filter @mro/web test:watch    # watch mode
pnpm --filter @mro/web test:coverage # with coverage report
```

### 8. Prisma Studio (database browser)

```bash
pnpm db:studio       # opens browser UI at http://localhost:5555
```

---

## Development Environment

A shared dev server for the team — uses real services behind feature flags.

### Infrastructure

- **Database**: Neon or Supabase free tier (branched from main)
- **Hosting**: Vercel Preview deployments (auto-created per PR)
- **Email**: Resend test API key (emails go to a shared inbox, not real customers)
- **Stripe**: Test mode keys (`sk_test_` / `pk_test_`)
- **Storage**: Vercel Blob dev store

### Environment variables (Vercel → Project → Settings → Environment Variables)

```env
DATABASE_URL="postgresql://<user>:<pass>@<neon-host>/arsenal_dev?pgbouncer=true"
AUTH_SECRET="<generated>"
AUTH_URL="https://arsenal-analytics-git-<branch>.vercel.app"
NEXT_PUBLIC_APP_URL="https://arsenal-analytics-git-<branch>.vercel.app"
NODE_ENV="development"
RESEND_API_KEY="re_test_xxxx"
RESEND_FROM_EMAIL="dev@your-domain.com"
STRIPE_SECRET_KEY="sk_test_xxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxx"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxx"
SEED_PASSWORD="Arsenal2025!"
```

### Deploying to dev

Push any branch — Vercel creates a preview URL automatically.

```bash
git push origin feature/my-branch
# → https://arsenal-analytics-git-feature-my-branch.vercel.app
```

To run migrations on the dev database:

```bash
DATABASE_URL="<dev-url>" pnpm db:deploy
```

### Stripe webhook (dev)

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
# Copy the whsec_ value into STRIPE_WEBHOOK_SECRET
```

---

## Staging

Staging mirrors production exactly — same infrastructure, isolated data.

### Infrastructure

- **Database**: Neon staging branch (separate from production)
- **Hosting**: Vercel (staging environment or separate project)
- **Email**: Resend with a staging subdomain (`billing-staging@your-domain.com`)
- **Stripe**: Test mode keys
- **Storage**: Vercel Blob staging store

### Initial staging setup

```bash
# 1. Create the staging database (Neon dashboard → New Branch)
# 2. Run all migrations
DATABASE_URL="<staging-url>" pnpm db:deploy

# 3. Seed staging with realistic but non-PII data
SEED_PASSWORD="StagingPassword1!" DATABASE_URL="<staging-url>" pnpm db:seed
```

### Deploying to staging

```bash
git checkout main
git pull
# Vercel auto-deploys main to staging if configured, or:
vercel --env staging
```

### Smoke test checklist (after every staging deploy)

- [ ] Log in as each role (Owner, Manager, Accountant, Technician)
- [ ] Create a work order → add labor → add part request
- [ ] Generate a quote → send via portal link → approve from portal
- [ ] Generate an invoice → record payment
- [ ] Run AR Aging and Technician Efficiency reports
- [ ] Export AR Aging CSV and Print/PDF
- [ ] Upload a compliance document
- [ ] Upload a squawk photo
- [ ] Invite a new user and verify email delivery

---

## Production Deployment

### Infrastructure checklist

| Service | Recommended | Notes |
|---------|------------|-------|
| Hosting | Vercel Pro | Auto-scaling, edge network |
| Database | Neon or Supabase | Enable connection pooling (pgBouncer) |
| Email | Resend | Verify sending domain with SPF/DKIM |
| Payments | Stripe | Use live keys, register webhook endpoint |
| File storage | Vercel Blob | Add via Vercel dashboard |
| Monitoring | Vercel Analytics + Sentry (optional) | |

### Production environment variables

Set these in Vercel → Project → Settings → Environment Variables (Production only):

```env
DATABASE_URL="postgresql://<user>:<pass>@<prod-host>/arsenal_prod?pgbouncer=true&connect_timeout=15"
AUTH_SECRET="<openssl rand -base64 32 — unique per environment>"
AUTH_URL="https://app.your-domain.com"
NEXT_PUBLIC_APP_URL="https://app.your-domain.com"
NODE_ENV="production"

RESEND_API_KEY="re_live_xxxx"
RESEND_FROM_EMAIL="billing@your-domain.com"

STRIPE_SECRET_KEY="sk_live_xxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxxx"

BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxx"
```

> **Do not set SEED_PASSWORD in production.** The seed script should never run
> against production data.

### First production deploy

```bash
# 1. Provision database and run migrations (never run db:seed in production)
DATABASE_URL="<prod-url>" pnpm db:deploy

# 2. Deploy via Vercel CLI or push to main
vercel --prod
# or: git push origin main (if Vercel is connected to main)

# 3. Register the Stripe production webhook
#    Stripe Dashboard → Developers → Webhooks → Add endpoint
#    URL: https://app.your-domain.com/api/stripe/webhook
#    Events: payment_intent.succeeded, payment_intent.payment_failed,
#            checkout.session.completed

# 4. Verify DNS
#    Point app.your-domain.com → Vercel (CNAME or A record per Vercel dashboard)
#    Add domain in Vercel → Project → Settings → Domains

# 5. Configure email domain (Resend dashboard → Domains)
#    Add SPF, DKIM, and DMARC DNS records
```

### Ongoing deployments

```bash
# Standard release
git checkout main
git merge --no-ff release/vX.Y.Z
git push origin main
# → Vercel auto-deploys, runs build + type-check

# Migrations are NOT run automatically — run manually before/after deploy:
DATABASE_URL="<prod-url>" pnpm db:deploy
```

### Rollback

```bash
# Vercel: Deployments tab → click previous deployment → Promote to Production
# Database: Prisma doesn't support automatic rollback — keep migration rollback
#           SQL files alongside each migration if schema changes are risky.
```

---

## First Partner Customer Onboarding

This section walks through setting up your first real MRO customer on the
production instance.

### Step 1 — Create the organization account

Currently the app is single-tenant (one org per deployment). The seed org slug is
`skyline-aviation`. To rename it to the partner's shop:

1. Open **Prisma Studio** (or connect directly to the production database)
2. Update the `Organization` record:
   - `name` → Partner's legal business name (e.g., `"Mesa Aircraft Services"`)
   - `slug` → URL-safe identifier (e.g., `"mesa-aircraft"`)

Or use the Prisma CLI:

```bash
DATABASE_URL="<prod-url>" npx prisma studio
```

### Step 2 — Create the Owner account

```
App URL → /register  (or invite flow if email is configured)
```

Alternatively, create the user directly and hash the password:

```bash
# In the DB seed script pattern — or use the /api/users POST endpoint
# POST /api/users  { email, name, role: "OWNER", password }
```

> First login: navigate to **Settings → Users** and verify the Owner role is
> assigned.

### Step 3 — Configure labor rates

**Settings → Labor Rates**

Set rates for each billing model the partner uses:

| Billing Model | Typical starting rate |
|---------------|----------------------|
| Flat rate (standard) | $95–$120/hr |
| AOG (emergency) | Automatically 1.5× base rate |
| Warranty | $0 (or cost-recovery rate) |
| Training | Negotiated rate |

### Step 4 — Configure parts markup rules

**Settings → Parts Markup**

Default sliding scale (already seeded):

| Cost range | Markup |
|------------|--------|
| $0 – $25 | 100% |
| $25 – $100 | 75% |
| $100 – $500 | 50% |
| $500 – $2,000 | 35% |
| $2,000+ | 20% |

Adjust to match the partner's existing pricing policy.

### Step 5 — Import existing customers

Use the **Customers** page to add customers manually, or bulk-insert via the
Prisma seed script pattern:

```typescript
// packages/db/prisma/seed-partner.ts
await prisma.customer.createMany({
  data: [
    { orgId, name: 'Ace Air Charter', email: 'ops@aceair.com', phone: '555-0100' },
    // ...
  ],
  skipDuplicates: true,
});
```

Run it:

```bash
DATABASE_URL="<prod-url>" npx tsx packages/db/prisma/seed-partner.ts
```

### Step 6 — Add aircraft

For each customer, navigate to their profile and add aircraft records:

- N-number (FAA registration)
- Make / Model / Year
- Serial number
- Current TTSN (total time since new)

### Step 7 — Invite the partner's team

**Settings → Users → Invite User**

Recommended initial roles:

| Person | Role |
|--------|------|
| Shop owner / GM | OWNER |
| Service manager | MANAGER |
| Bookkeeper / AP | ACCOUNTANT |
| Lead technician | TECHNICIAN |
| Parts person | PARTS_CLERK |

Each invite sends a magic-link email (requires `RESEND_API_KEY`). The invitee
clicks the link and sets their password.

### Step 8 — Create the first work order

Walk through a real work order together with the partner:

1. **Work Orders → New Work Order**
   - Select customer and aircraft
   - Set type (ANNUAL, REPAIR, AOG, etc.)
   - Add initial squawk items
2. **Assign technician** and set status to IN_PROGRESS
3. **Log labor** as work progresses
4. **Add part requests** → receive parts → status moves to INSTALLED
5. **Generate invoice** from the work order (billing milestones optional)
6. **Send invoice** → customer receives email with payment link

### Step 9 — Test the customer portal

1. Create a quote for any pending work
2. Click **Send Quote** — copy the portal link from the response toast
3. Open the link in an incognito window (unauthenticated)
4. Verify the customer can view, approve, or decline the quote
5. Confirm the quote status updates in the app after the action

### Step 10 — Verify payments (if using Stripe)

1. Create and send an invoice
2. From the customer portal or invoice page, initiate a test payment
   - Use Stripe test card `4242 4242 4242 4242`, any future date, any CVC
3. Confirm the payment appears in **Invoices** with updated balance
4. Confirm the payment confirmation email is received

### Step 11 — Set up compliance tracking

**Compliance → Add Item**

Enter the aircraft's next due items:

- Annual inspection
- ELT battery expiry
- Altimeter / transponder certification
- Any AD compliance items

Upload supporting Form 337s or logbook photos using the file upload widget.

### Step 12 — Review the dashboard

After a week of real data:

- **Dashboard** — KPI cards: revenue MTD, AR balance, active WOs, AOG count
- **Reports → AR Aging** — identify overdue balances
- **Reports → Technician Efficiency** — utilization rates per tech
- **Reports → Job Profitability** — actual vs. estimated cost per WO
- Export AR Aging CSV for the partner's bookkeeper

---

## Quick Reference

```bash
# Local dev
pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev

# Run tests
pnpm --filter @mro/web test

# Check TypeScript
cd apps/web && npx tsc --noEmit

# Run linter
pnpm --filter @mro/web lint

# Deploy migrations to any environment
DATABASE_URL="<url>" pnpm db:deploy

# Open DB browser
pnpm db:studio
```
