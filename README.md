# Arsenal Analytics

Full-stack MRO management platform for aircraft maintenance facilities. Handles
work orders, parts, quotes, invoicing, compliance tracking, and financial
reporting across a web application and native mobile app.

---

## Features

- **Work Orders** — Create and manage maintenance jobs from intake to invoice;
  track squawks, labor entries, and part requests per job
- **AOG Management** — Flag and track Aircraft on Ground events; enforces priority
  handling and escalated billing rates; push alerts to technicians instantly
- **Quotes** — Generate itemized quotes; email customers a tokenized portal link
  to view, approve, or decline
- **Invoicing** — Convert work orders or quotes to invoices; accept online
  payments via Stripe; track AR aging and partial payments
- **Customer Portal** — Unauthenticated, token-secured pages for customers to
  view quotes and invoices and take action without creating an account
- **Parts & Purchasing** — Parts catalog with sliding-scale markup rules;
  purchase order workflow; low-stock alerts; barcode scanning on mobile
- **Compliance** — Per-aircraft compliance records (annuals, ADs, ELT
  certification, etc.) with document and photo attachments
- **Reports** — AR Aging, Job Profitability, Technician Efficiency; CSV export
- **Dashboard** — KPI cards (revenue MTD, AR balance, WIP value, AOG count),
  12-month revenue sparkline, labor utilization, parts margin
- **Settings** — Per-org labor rates, parts markup rules, user management with
  role-based access control

---

## Tech Stack

### Web (`apps/web`)

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

### Mobile (`apps/mobile`)

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.76, Expo SDK 52, TypeScript 5.7 |
| Navigation | Expo Router v4 (file-based, tab + stack) |
| Auth | Custom JWT (HS256 via `jose`), stored in `expo-secure-store` |
| Data fetching | TanStack Query v5 with AsyncStorage cache persistence |
| Camera | `expo-camera` (barcode scanning), `expo-image-picker` |
| Notifications | `expo-notifications` — Expo push service |
| Offline | AsyncStorage mutation queue replayed on reconnect |
| Styling | React Native `StyleSheet` + `@mro/tokens` design tokens |

### Shared

| Package | Purpose |
|---------|---------|
| `@mro/core` | Business logic (markup calc, AOG billing, labor rates, AR aging) and Zod schemas |
| `@mro/db` | Prisma client, generated types, migrations, and seed |
| `@mro/tokens` | Design tokens (colors, typography) shared across web and mobile |
| `@mro/api-client` | Typed fetch wrapper over the Next.js API routes; consumed by the mobile app |
| Turborepo + pnpm | Monorepo build orchestration and workspace management |

---

## Repository Structure

```
arsenal-analytics/
├── apps/
│   ├── web/                        # Next.js application
│   │   ├── app/                    # App Router routes and API handlers
│   │   │   └── api/mobile/         # Mobile-specific endpoints (auth, push tokens)
│   │   ├── components/             # React component library
│   │   └── lib/                    # Auth config, email, Stripe, push-notify
│   └── mobile/                     # React Native / Expo application
│       ├── app/
│       │   ├── _layout.tsx         # Root layout — auth gate, push init, offline queue
│       │   ├── (auth)/             # Sign-in screen
│       │   └── (tabs)/             # Bottom tab navigator
│       │       ├── index.tsx       # Dashboard (KPI grid)
│       │       ├── work-orders/    # Work order list, detail, log labor modal
│       │       ├── invoices/       # AR list and invoice detail
│       │       ├── parts/          # Parts catalog with barcode scanner
│       │       └── settings/       # Profile and sign-out
│       ├── components/
│       │   ├── ui/                 # Card, Badge, Button, LoadingSpinner, OfflineBanner
│       │   └── BarcodeScanner.tsx  # Full-screen barcode scanner modal
│       └── lib/
│           ├── api.ts              # createMroClient instance
│           ├── auth.ts             # SecureStore token helpers
│           ├── notifications.ts    # Push notification registration
│           ├── offline-queue.ts    # Mutation queue for offline use
│           ├── persist-cache.ts    # TanStack Query cache persistence
│           └── upload.ts           # expo-image-picker + /api/uploads wrapper
├── packages/
│   ├── api-client/                 # Typed API client (consumed by mobile)
│   │   └── src/endpoints/         # auth, analytics, work-orders, parts,
│   │                              #   technicians, invoices, push-tokens
│   ├── db/                         # Prisma schema, migrations, seed
│   ├── core/                       # Shared business logic and Zod schemas
│   └── tokens/                     # Design tokens and global CSS
├── SETUP.md                        # Local dev, staging, and production guide
└── turbo.json
```

---

## Quick Start — Web

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

## Quick Start — Mobile

**Prerequisites:** [Expo Go](https://expo.dev/go) on a physical device or a
running iOS/Android simulator. The web server must be running and reachable
from the device.

```bash
# From the repo root — install all workspace dependencies
pnpm install

# Create the mobile environment file
# Use your machine's LAN IP so a physical device can reach the server
echo 'EXPO_PUBLIC_API_URL=http://<your-local-ip>:3000' > apps/mobile/.env.local

# Start the Expo dev server
pnpm mobile
# or: cd apps/mobile && pnpm dev
```

Scan the QR code with Expo Go or press `i`/`a` for a simulator. Sign in with
any seed account — the JWT is stored in `SecureStore` and persists across
restarts.

### Push notifications (optional)

Push notifications require a physical device and an EAS project:

1. Create a project at [expo.dev](https://expo.dev)
2. Run `eas init` inside `apps/mobile`
3. Replace `"replace-with-eas-project-id"` in `apps/mobile/app.json`
4. Build a development client with `eas build --profile development`

AOG alerts fire via `sendAogAlert()` in `apps/web/lib/push-notify.ts` and are
delivered to all active technicians' registered devices through the Expo push
service.

### Offline behaviour

| Scenario | Behaviour |
|----------|-----------|
| No connection on launch | All screens render from the 7-day AsyncStorage query cache |
| Connection lost mid-session | Amber banner appears; reads continue from cache |
| Mutation while offline | `logLabor` and `markTaskComplete` are queued locally |
| Connection restored | Queue replays automatically; query cache refreshes |

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all packages in watch mode |
| `pnpm mobile` | Start the Expo dev server (`apps/mobile`) |
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

### Web (`.env` or `apps/web/.env.local`)

Required:

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
| `BLOB_READ_WRITE_TOKEN` | Document and photo uploads (web + mobile squawk photos) |
| `SEED_PASSWORD` | Password for seeded demo users (dev/staging only) |

### Mobile (`apps/mobile/.env.local`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Base URL of the web server (e.g. `http://192.168.1.10:3000`) |

---

## User Roles

| Role | Web | Mobile |
|------|-----|--------|
| OWNER | Full access including org settings and user management | All tabs |
| MANAGER | All operational data; cannot manage billing settings | All tabs |
| ACCOUNTANT | Invoices, payments, reports; read-only on WOs | Dashboard, Invoices |
| PARTS_CLERK | Parts catalog and purchase orders | Parts tab |
| TECHNICIAN | Own labor entries and assigned work orders | Work Orders, Parts |

---

## Mobile API Architecture

The mobile app communicates through the existing Next.js API routes — no
separate backend is needed. A 30-day HS256 JWT (signed with `AUTH_SECRET`) is
issued by `POST /api/mobile/auth/login` and sent as `Authorization: Bearer
<token>` on every request. The `@mro/api-client` package injects the token
automatically.

Mobile-specific endpoints:

| Endpoint | Description |
|----------|-------------|
| `POST /api/mobile/auth/login` | Credential validation → JWT |
| `POST /api/mobile/push-tokens` | Register Expo push token |
| `DELETE /api/mobile/push-tokens` | Unregister on sign-out |

All other endpoints (`/api/work-orders`, `/api/invoices`, `/api/parts`, etc.)
accept the Bearer JWT in addition to the web session cookie.

---

## CI / Deployment

GitHub Actions runs on every push:

1. **Typecheck** — `prisma generate` + `tsc --noEmit`
2. **Lint** — `next lint`
3. **Build** — `turbo build` (depends on typecheck)
4. **Deploy staging** — Vercel preview on the `staging` branch
5. **Deploy production** — Prisma migrate deploy + Vercel production on `main`

For mobile releases, use EAS Build and EAS Submit. See the
[Expo documentation](https://docs.expo.dev/build/introduction/) for the full
pipeline.

See [SETUP.md](./SETUP.md) for the full deployment checklist and first-customer
onboarding walkthrough.

TEST COMMIT TO UPDATE VERCEL