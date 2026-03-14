# Arsenal Analytics

Full-stack MRO management platform for aircraft maintenance facilities. Handles
work orders, parts, quotes, invoicing, compliance tracking, and financial
reporting in a single application.

---

## Features

- **Work Orders** — Create and manage maintenance jobs from intake to invoice;
  track squawks, labor entries, and part requests per job
- **AOG Management** — Flag and track Aircraft on Ground events; enforces priority
  handling and escalated billing rates
- **Quotes** — Generate itemized quotes; email customers a tokenized portal link
  to view, approve, or decline
- **Invoicing** — Convert work orders or quotes to invoices; accept online
  payments via Stripe; track AR aging and partial payments
- **Customer Portal** — Unauthenticated, token-secured pages for customers to
  view quotes and invoices and take action without creating an account
- **Parts & Purchasing** — Parts catalog with sliding-scale markup rules;
  purchase order workflow; low-stock alerts
- **Compliance** — Per-aircraft compliance records (annuals, ADs, ELT
  certification, etc.) with document and photo attachments
- **Reports** — AR Aging, Job Profitability, Technician Efficiency; CSV export
- **Dashboard** — KPI cards (revenue MTD, AR balance, WIP value, AOG count),
  12-month revenue sparkline, labor utilization, parts margin
- **Settings** — Per-org labor rates, parts markup rules, user management with
  role-based access control

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5.7 |
| Database | PostgreSQL + Prisma 6 ORM |
| Auth | Auth.js v5 (NextAuth) — Credentials provider + JWT |
| Styling | Tailwind CSS 4.0, Radix UI primitives |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query v5, TanStack Table v8 |
| Charts | Recharts |
| Email | Resend |
| Payments | Stripe (optional) |
| File storage | Vercel Blob (optional) |
| Testing | Vitest + Happy DOM |
| Monorepo | Turborepo + pnpm workspaces |

---

## Repository Structure

```
arsenal-analytics/
├── apps/
│   └── web/                  # Next.js application
│       ├── app/              # App Router routes and API handlers
│       ├── components/       # React component library
│       └── lib/              # Auth config, email helpers, Stripe client
├── packages/
│   ├── db/                   # Prisma schema, migrations, seed
│   ├── core/                 # Shared business logic and Zod schemas
│   └── tokens/               # Design tokens and global CSS
├── SETUP.md                  # Local dev, staging, and production guide
└── turbo.json
```

---

## Quick Start

> Full instructions including staging and production deployment are in
> [SETUP.md](./SETUP.md).

**Prerequisites:** Node.js ≥ 20, pnpm 9, PostgreSQL ≥ 15 (or Docker)

```bash
# Install dependencies
pnpm install

# Start local database (Docker)
docker run -d --name arsenal-db \
  -e POSTGRES_USER=arsenal \
  -e POSTGRES_PASSWORD=arsenal_dev \
  -e POSTGRES_DB=arsenal_analytics \
  -p 5432:5432 postgres:16

# Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and AUTH_SECRET

# Migrate and seed
pnpm db:migrate
pnpm db:seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with one of the
seed accounts:

| Role | Email | Password |
|------|-------|----------|
| Owner | admin@skylineaviation.com | Arsenal2025! |
| Manager | manager@skylineaviation.com | Arsenal2025! |
| Accountant | billing@skylineaviation.com | Arsenal2025! |
| Technician | jsmith@skylineaviation.com | Arsenal2025! |

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all packages in watch mode |
| `pnpm build` | Production build (via Turbo) |
| `pnpm lint` | ESLint across all packages |
| `pnpm format` | Prettier on TS/TSX/MD files |
| `pnpm db:migrate` | Run Prisma migrations (dev) |
| `pnpm db:deploy` | Apply migrations to a non-dev database |
| `pnpm db:seed` | Seed demo org, users, and data |
| `pnpm db:studio` | Open Prisma Studio at localhost:5555 |
| `pnpm --filter @mro/web test` | Run unit tests |
| `pnpm --filter @mro/web test:coverage` | Tests with coverage report |

---

## Environment Variables

Copy `.env.example` to `.env`. Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random 32-byte secret (`openssl rand -base64 32`) |
| `AUTH_URL` | Canonical app URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL`; exposed to the browser |

Optional (features degrade gracefully without them in development):

| Variable | Feature |
|----------|---------|
| `RESEND_API_KEY` | Transactional email — quote/invoice delivery |
| `RESEND_FROM_EMAIL` | Sending address for emails |
| `STRIPE_SECRET_KEY` | Online invoice payment checkout |
| `STRIPE_WEBHOOK_SECRET` | Stripe event verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe.js |
| `BLOB_READ_WRITE_TOKEN` | Compliance document and photo uploads |
| `SEED_PASSWORD` | Password for seeded demo users (dev/staging only) |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| OWNER | Full access including org settings and user management |
| MANAGER | All operational data; cannot manage billing settings |
| ACCOUNTANT | Invoices, payments, reports; read-only on WOs |
| PARTS_CLERK | Parts catalog and purchase orders |
| TECHNICIAN | Own labor entries and assigned work orders |

---

## CI / Deployment

GitHub Actions runs on every push:

1. **Typecheck** — `prisma generate` + `tsc --noEmit`
2. **Lint** — `next lint`
3. **Build** — `turbo build` (depends on typecheck)
4. **Deploy staging** — Vercel preview on the `staging` branch
5. **Deploy production** — Prisma migrate deploy + Vercel production on `main`

See [SETUP.md](./SETUP.md) for the full deployment checklist and first-customer
onboarding walkthrough.
