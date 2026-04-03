# Arsenal MRO — Field Testing Readiness Plan

## Executive Summary

The platform has a solid, feature-complete backend and a well-structured frontend. There are
**four categories of work** before technicians can test in the field:

1. **Production deployment is broken** — all Vercel env vars are scoped to "Development"
   only; the Production environment has no secrets, so every API call returns 500.
2. **Missing web features for field technicians** — the sidebar is admin-centric with no
   role filtering, the org name is hardcoded, and there is no "My Work Orders" view for
   technicians to see only their assigned jobs.
3. **Mobile app is not distributable** — the EAS project ID is a placeholder, push
   notifications won't fire, and the tab bar uses Unicode emoji instead of real icons.
4. **Field testing infrastructure** — production DB needs seeding, cron jobs aren't
   scheduled, and email/file-upload env vars are missing.

---

## Phase 1 — Fix Production Deployment (Critical / Blocking)

All subsequent phases are meaningless until the web app stops returning 500 on every route.

### 1a. Vercel environment variable scoping (manual — Vercel dashboard)

Every variable currently shows "Development" environment only. Edit each one and check
**Production** and **Preview** in addition to Development:

| Variable | Required | Notes |
|---|---|---|
| `AUTH_SECRET` | ✅ | Already has correct value — just promote to Production |
| `AUTH_URL` | ✅ | `https://arsenal-analytics.vercel.app` — promote to Production |
| `DATABASE_URL` | ✅ | Railway connection string — promote to Production |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://arsenal-analytics.vercel.app` — **add**, missing entirely |
| `RESEND_API_KEY` | ✅ | From resend.com — **add**, required for invites & password reset |
| `RESEND_FROM_EMAIL` | ✅ | Verified sender, e.g. `noreply@arsenalaviationservices.com` — **add** |
| `BLOB_READ_WRITE_TOKEN` | ⚠️ | Vercel Blob token — **add** to enable squawk photo uploads |
| `CRON_SECRET` | ⚠️ | Random string — **add**, used to protect cron endpoints |

### 1b. Add Vercel cron schedule to `vercel.json`

The daily FP&A snapshot cron exists as an API route but is never called. Add the schedule
to `vercel.json` and protect the endpoint with `CRON_SECRET`.

**Files changed:** `vercel.json`, `apps/web/app/api/cron/snapshot/route.ts`,
`apps/web/app/api/cron/mark-overdue/route.ts`

### 1c. Run production database migration (manual — Railway CLI or dashboard)

```bash
# From local machine with DATABASE_URL pointing at Railway production:
pnpm db:deploy
```

This runs `prisma migrate deploy` which applies all pending migrations to the Railway
PostgreSQL instance without resetting data.

### 1d. Seed production database with test data (manual)

```bash
SEED_PASSWORD="Arsenal2025!" DATABASE_URL="<railway-url>" pnpm db:seed
```

This creates the demo org "Skyline Aviation Services", 6 users (owner, manager, 2
technicians, parts clerk, accountant), sample work orders, aircraft, and customers — the
minimum dataset for a meaningful field test.

---

## Phase 2 — Web App Technician Experience (Missing Features)

### 2a. Role-based sidebar and navigation

**Problem:** The sidebar shows all nav items (Analytics, Reports, Settings, Invoices,
Quotes) to every user including technicians. A field technician should only see Work
Orders, AOG, Aircraft, Parts, and Compliance. The sidebar also hardcodes `"Skyline
Aviation"` instead of the org name from the database.

**Solution:**
- Read the session in `AppSidebar` via `useSession()` and filter nav items by role.
- TECHNICIAN role sees: Dashboard, Work Orders, AOG, Aircraft, Parts & POs, Compliance.
- PARTS_CLERK role sees everything except Analytics, Reports.
- ACCOUNTANT role sees everything except Settings (org-level settings remain MANAGER+).
- Replace hardcoded org name with the value from session (org name is already in the JWT
  from the NextAuth `jwt` callback via `user.org.name`).
- Show the logged-in user's name and role badge at the bottom of the sidebar.

**Files changed:** `apps/web/components/layout/AppSidebar.tsx`,
`apps/web/auth.ts` (add `orgName` to JWT payload)

### 2b. "My Work Orders" technician filter

**Problem:** The WO list shows all work orders in the org. A technician in the field
only needs to see jobs they are assigned to. There is no technician filter, and the `User`
and `Technician` models are not linked (a logged-in TECHNICIAN user cannot automatically
identify their `Technician` record).

**Solution:**
1. Add optional `userId` field to the `Technician` Prisma model (nullable FK to `User`).
2. Generate and run a migration.
3. Add a `technicianId` query param to `GET /api/work-orders` that filters to WOs
   containing at least one `WorkOrderLineItem` with that `technicianId`.
4. In `WorkOrdersTable`, when the session role is `TECHNICIAN`, show a "My Work Orders"
   toggle that auto-passes the technician's ID as a filter. Non-technician roles see an
   "Assigned To" dropdown to filter by any technician.
5. In the Settings → Technicians page, show a "Link to user account" field so admins
   can connect a `User` login to a `Technician` payroll record.

**Files changed:** `packages/db/prisma/schema.prisma`,
`apps/web/app/api/work-orders/route.ts`,
`apps/web/components/work-orders/WorkOrdersTable.tsx`,
`apps/web/app/(app)/settings/technicians/page.tsx` (link user→tech UI)

### 2c. CRON_SECRET protection on cron routes

Both `/api/cron/snapshot` and `/api/cron/mark-overdue` currently have no authentication —
any HTTP client can trigger them. Add a bearer token check using `CRON_SECRET`.

**Files changed:** `apps/web/app/api/cron/snapshot/route.ts`,
`apps/web/app/api/cron/mark-overdue/route.ts`

---

## Phase 3 — Mobile App Distribution

### 3a. Configure EAS project (manual — Expo/EAS CLI)

The `app.json` has `"projectId": "replace-with-eas-project-id"` and `"owner": null`.
Push notifications will fail silently until this is configured.

```bash
cd apps/mobile
npx eas-cli login          # Authenticate with Expo account
npx eas-cli init           # Creates/links EAS project and writes real projectId
```

After `eas init`, commit the updated `app.json` with the real `projectId` and `owner`.

### 3b. Replace Unicode emoji tab icons with @expo/vector-icons

**Problem:** Tab bar shows `⬡`, `🔧`, `📋`, `⚙` placeholders. These render
inconsistently across Android/iOS and look unpolished for a field testing session.

**Solution:** Install `@expo/vector-icons` (already bundled in Expo SDK) and swap the
`TabIcon` component to use `Ionicons`. No native rebuild required — this is a JS-only
change.

| Tab | Icon name |
|---|---|
| Dashboard | `speedometer-outline` / `speedometer` |
| Work Orders | `construct-outline` / `construct` |
| Invoices | `document-text-outline` / `document-text` |
| Parts | `cube-outline` / `cube` |
| Settings | `settings-outline` / `settings` |

**Files changed:** `apps/mobile/app/(tabs)/_layout.tsx`

### 3c. Wire push notification deep-linking

**Problem:** `addNotificationListeners` is a working helper but is never called anywhere
in the app. Tapping an AOG or WO push notification does nothing.

**Solution:** Call `addNotificationListeners` in the root `_layout.tsx` with a response
handler that reads `notification.request.content.data.workOrderId` and calls
`router.push('/work-orders/' + workOrderId)`. The AOG alert channel should route to
`/work-orders?type=AOG`.

**Files changed:** `apps/mobile/app/_layout.tsx`

### 3d. EAS Build for distribution (manual — after 3a is complete)

```bash
# iOS — builds .ipa and submits to TestFlight
eas build --platform ios --profile preview

# Android — builds .apk for direct install
eas build --platform android --profile preview --local
```

Distribute the TestFlight link to iOS testers and the APK via direct download for Android.
Field testers need the production `NEXT_PUBLIC_API_URL` set in `eas.json` build profiles:

```json
{
  "build": {
    "preview": {
      "env": {
        "NEXT_PUBLIC_API_URL": "https://arsenal-analytics.vercel.app"
      }
    }
  }
}
```

**Files changed:** `apps/mobile/eas.json` (create if not present)

---

## Phase 4 — Field Testing Preparation

### 4a. Create named test accounts for field testers (manual — after Phase 1d)

Use the admin UI at `/settings/users` to invite each field tester by email. Assign them
the `TECHNICIAN` role. Link each user account to their `Technician` record in
`/settings/technicians` (requires Phase 2b to be complete).

Alternatively, use the seed script's demo accounts:

| Email | Role | Password |
|---|---|---|
| `owner@skyline.test` | OWNER | `Arsenal2025!` |
| `manager@skyline.test` | MANAGER | `Arsenal2025!` |
| `tech1@skyline.test` | TECHNICIAN | `Arsenal2025!` |
| `tech2@skyline.test` | TECHNICIAN | `Arsenal2025!` |
| `parts@skyline.test` | PARTS_CLERK | `Arsenal2025!` |
| `accounting@skyline.test` | ACCOUNTANT | `Arsenal2025!` |

### 4b. Smoke test checklist (before handing to technicians)

**Auth flows:**
- [ ] Sign in / sign out
- [ ] Password reset email received and link works
- [ ] User invite email received and account creation works

**Technician web workflow:**
- [ ] Dashboard loads KPIs without 500 errors
- [ ] Work Orders list loads; "My Work Orders" toggle filters correctly
- [ ] Open a WO, log labor time, verify it saves
- [ ] File a squawk with a photo, verify photo uploads to Vercel Blob
- [ ] Request a part, mark it received
- [ ] Mark a line item complete

**Finance workflow:**
- [ ] Create a quote, send to customer portal, approve it
- [ ] Convert quote to work order
- [ ] Create an invoice from the work order
- [ ] Record a payment

**Mobile:**
- [ ] Log in on physical iOS/Android device
- [ ] WO list loads, WO detail opens
- [ ] Log labor while offline, verify it queues and replays when reconnected
- [ ] Take squawk photo, verify upload
- [ ] Tap a push notification, verify it navigates to the correct WO

---

## Implementation Order & Priority

```
WEEK 1  Phase 1 (all items) — unblocks everything else
        Phase 2c (cron protection) — quick, low-risk

WEEK 1  Phase 2a (role sidebar + org name) — high visibility for field testers
        Phase 2b (my work orders filter) — essential for technician UX

WEEK 2  Phase 3b (mobile icons) — quick win, improves polish
        Phase 3c (notification deep-linking) — one file change
        Phase 3a + 3d (EAS setup + build) — requires Expo account setup

WEEK 2  Phase 4 (accounts + smoke test) — final gate before field handoff
```

---

## Environment Variables — Complete Reference for Vercel Production

| Variable | Value | Where to get it |
|---|---|---|
| `AUTH_SECRET` | `<generate with: openssl rand -base64 32>` | Already set (promote scope) — **rotate if exposed** |
| `AUTH_URL` | `https://arsenal-analytics.vercel.app` | Already set (promote scope) |
| `DATABASE_URL` | `postgresql://...` | Already set (promote scope) |
| `NEXT_PUBLIC_APP_URL` | `https://arsenal-analytics.vercel.app` | Same as AUTH_URL |
| `RESEND_API_KEY` | `re_xxxx` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` | Must be verified in Resend |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_xxxx` | Vercel dashboard → Storage → Blob |
| `CRON_SECRET` | `openssl rand -hex 32` | Generate locally |
| `STRIPE_SECRET_KEY` | `sk_test_xxxx` | Optional — only for online payments |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_xxxx` | Optional |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxx` | Optional |
