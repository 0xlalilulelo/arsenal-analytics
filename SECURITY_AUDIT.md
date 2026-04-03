# Arsenal Analytics — Security Audit & Code Review

**Date:** 2026-04-03
**Scope:** Full codebase — authentication, API routes, secrets, data exposure, business logic

---

## Executive Summary

The codebase has **5 critical, 10 high, and 8 medium severity issues**. The most urgent finding is that **nearly all API routes lack proper authentication** — they resolve the organization by calling `prisma.organization.findFirst()` with no session check, meaning any request (authenticated or not) accesses the first org's data. This must be fixed before any production or field testing use.

---

## CRITICAL Severity

### C1. Multi-Tenant Bypass — API Routes Have No Session Checks

**~40 routes affected.** The `resolveOrgId()` helper used across most API files does:

```typescript
async function resolveOrgId() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}
```

This returns the **first org in the database** regardless of caller identity. No `auth()` call, no session validation.

**Files (non-exhaustive):**
- `apps/web/app/api/work-orders/route.ts` (lines 6-9)
- `apps/web/app/api/invoices/route.ts` (lines 8-11)
- `apps/web/app/api/quotes/route.ts` (lines 5-8)
- `apps/web/app/api/customers/route.ts` (lines 8-9)
- `apps/web/app/api/technicians/route.ts` (lines 5-6)
- `apps/web/app/api/parts/route.ts` (lines 5-9)
- `apps/web/app/api/purchase-orders/route.ts` (lines 5-8)
- `apps/web/app/api/compliance/route.ts`
- `apps/web/app/api/analytics/route.ts` (lines 6-8)
- `apps/web/app/api/aircraft/route.ts` (line 9)

**Impact:** Complete data breach. Any HTTP client can read/modify all financial records, customer data, work orders, and invoices across every organization.

**Fix:** Replace all `resolveOrgId()` implementations:
```typescript
import { auth } from '@/auth';

async function resolveOrgId() {
  const session = await auth();
  const orgId = (session?.user as { orgId?: string })?.orgId;
  if (!orgId) return null;
  return orgId;
}
```
Add a 401 guard at the top of every route handler:
```typescript
const orgId = await resolveOrgId();
if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

---

### C2. Cron Endpoints Have Zero Authentication

Both cron routes accept unauthenticated POST requests:

- `apps/web/app/api/cron/snapshot/route.ts` (line 8)
- `apps/web/app/api/cron/mark-overdue/route.ts` (line 7)

**Impact:** Any attacker can trigger database-wide snapshot creation or mark all invoices as overdue.

**Fix:** Add `CRON_SECRET` bearer token check:
```typescript
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... existing logic
}
```

---

### C3. Demo User Passwordless Login Backdoor

**Files:**
- `apps/web/auth.ts` (lines 21-22)
- `apps/web/app/api/mobile/auth/login/route.ts` (lines 24-26)

```typescript
// If user has no passwordHash and NODE_ENV === 'development', skip auth
if (process.env.NODE_ENV === 'development') return user;
```

If seed data is present in production (users with `passwordHash = null`) and `NODE_ENV` is misconfigured, anyone can log in as any demo user with any password.

**Fix:** Remove the development bypass entirely. Ensure seed script always hashes passwords:
```typescript
// auth.ts — delete lines 21-22
// Always require passwordHash
if (!user.passwordHash) return null;
```

---

### C4. AUTH_SECRET Committed to Repository

**File:** `FIELD_TESTING_PLAN.md` (line 270)

```
| `AUTH_SECRET` | `kypz7h9pVz4AXRbcuN+rS+5+cB6IA1NIQbwdMJwVfNI=` | Already set |
```

The actual production JWT signing secret is in a tracked file. Anyone with repo access can forge arbitrary JWT tokens.

**Fix:**
1. Rotate the AUTH_SECRET immediately in Vercel dashboard
2. Replace the value in FIELD_TESTING_PLAN.md with `<generate with: openssl rand -base64 32>`
3. Audit git history for other committed secrets

---

### C5. No Rate Limiting on Authentication Endpoints

**Files:**
- `apps/web/auth.ts` — Credentials provider (login)
- `apps/web/app/api/auth/register/route.ts` — registration
- `apps/web/app/api/auth/forgot-password/route.ts` — password reset
- `apps/web/app/api/auth/reset-password/route.ts` — token submission
- `apps/web/app/api/mobile/auth/login/route.ts` — mobile login

Zero rate limiting on any auth endpoint. Enables brute-force login, credential stuffing, registration spam, and password reset flooding.

**Fix:** Add rate limiting via Upstash Ratelimit, Vercel KV, or edge middleware:
```typescript
// 5 attempts per 15 minutes per IP+email
const { success } = await ratelimit.limit(`auth:${ip}:${email}`);
if (!success) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
```

---

## HIGH Severity

### H1. Missing Role-Based Access Control on API Routes

Middleware enforces role guards on page routes (e.g., `/settings` requires MANAGER), but **API routes do not check roles**. A TECHNICIAN can call `POST /api/invoices` to create invoices, `POST /api/invoices/[id]/payments` to record payments, or `POST /api/quotes/[id]/convert` to convert quotes.

**Fix:** Add `hasRole()` checks in each route handler for the appropriate minimum role.

---

### H2. Open Redirect via `callbackUrl`

**File:** `apps/web/app/(auth)/sign-in/page.tsx` (lines 9-10, 33)

```typescript
const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
router.push(callbackUrl); // Unvalidated — can be external URL
```

**Fix:** Validate that callbackUrl is a relative path or same-origin URL before redirecting.

---

### H3. Portal Token Brute Force — No Rate Limiting or Expiry

**Files:**
- `apps/web/app/api/portal/invoices/[token]/route.ts`
- `apps/web/app/api/portal/quotes/[token]/route.ts`
- `apps/web/app/api/portal/quotes/[token]/respond/route.ts`

Portal tokens are the sole authentication for customer-facing endpoints. No rate limiting, no expiration check, no token rotation after use. An attacker can brute-force tokens to access invoices and approve/decline quotes.

**Fix:** Add rate limiting, token expiration timestamps, and use cryptographically strong tokens (min 32 bytes).

---

### H4. Mass Assignment in Parts Creation

**File:** `apps/web/app/api/parts/route.ts` (line 71)

```typescript
const part = await prisma.part.create({ data: { orgId, ...body } });
```

Request body is spread directly into Prisma create. Attacker can set arbitrary fields (e.g., `id`, `createdAt`, `orgId` override).

**Fix:** Whitelist specific fields from the request body.

---

### H5. Race Condition in Payment Recording

**File:** `apps/web/app/api/invoices/[id]/payments/route.ts` (lines 24-47)

Payment validation reads `invoice.payments`, checks remaining balance, then creates a new payment in separate queries. Concurrent requests can both pass validation and create duplicate/over-payments.

**Fix:** Wrap in `prisma.$transaction()` with fresh reads inside the transaction.

---

### H6. Unvalidated Numeric Inputs

Multiple routes accept numeric values (hours, amounts, rates, quantities) without bounds checking. Examples:
- `apps/web/app/api/work-orders/route.ts` — `aogMileage`, `aogTechCount` can be negative or enormous
- `apps/web/app/api/work-orders/[id]/labor/route.ts` — `hours` not bounded
- `apps/web/app/api/invoices/route.ts` — `taxRate` not validated (could be 10000%)
- `apps/web/app/api/settings/org/route.ts` — `laborRoundingMinutes` can be 0 or negative

**Fix:** Add Zod schema validation on all request bodies with `.min()` / `.max()` constraints.

---

### H7. Stripe Webhook Missing Idempotency Check

**File:** `apps/web/app/api/webhooks/stripe/route.ts`

Stripe signature IS verified (good), but there's no check for duplicate event processing. If Stripe retries a webhook, the same payment could be recorded twice.

**Fix:** Check `payment.reference` for existing Stripe session ID before creating.

---

### H8. Weak Password Policy

**Files:** `apps/web/app/(auth)/sign-up/page.tsx`, `apps/web/app/api/auth/register/route.ts`, etc.

Minimum 8 characters, no complexity requirements. Below NIST recommendations.

**Fix:** Require minimum 12 characters, or 10 with complexity (upper + lower + digit + special).

---

### H9. Hardcoded Seed Password in Source

**File:** `packages/db/prisma/seed.ts` (line 7)

```typescript
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Arsenal2025!';
```

Fallback password is in source code and also documented in FIELD_TESTING_PLAN.md, README.md, SETUP.md.

**Fix:** Remove the fallback — require `SEED_PASSWORD` env var. Remove passwords from docs.

---

### H10. File Upload Type Validation Trusts Client MIME Type

**File:** `apps/web/app/api/uploads/route.ts` (line 39)

```typescript
if (!ALLOWED_TYPES.includes(file.type)) { ... }
```

`file.type` is client-controlled. An attacker can upload an executable with `Content-Type: image/jpeg`.

**Fix:** Validate file magic bytes (first few bytes) server-side, not just the MIME header.

---

## MEDIUM Severity

### M1. No Error Boundaries in React App

No `error.tsx` files found in the app directory. Component errors crash the entire page with a blank screen.

**Fix:** Add `apps/web/app/error.tsx` and `apps/web/app/(app)/error.tsx` with user-friendly fallback UI.

---

### M2. Unsafe `as any` Casts on Enum Values

**Files:**
- `apps/web/app/api/quotes/route.ts` (line 86): `category: l.category as any`
- `apps/web/app/api/purchase-orders/route.ts` (line 82): `condition: (li.condition ?? 'NEW') as any`

Untrusted input from request body is cast to Prisma enums without validation. Invalid values will cause database errors.

**Fix:** Validate against `Object.values(EnumType)` before using.

---

### M3. Generic Error Responses Hide Root Cause

All API routes catch errors with:
```typescript
catch (e) {
  console.error(e);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

Validation errors (400), not-found (404), and constraint violations (409) all return 500. Clients can't distinguish user error from server error.

**Fix:** Classify errors — return appropriate status codes for known error types.

---

### M4. No Audit Logging on Financial Operations

Payments, quote conversions, invoice status changes, and squawk approvals are not logged to any audit trail. Required for aviation compliance and dispute resolution.

**Fix:** Write to an `AuditLog` table on all financial state changes. (Already identified in gap analysis as Gap #7.)

---

### M5. Missing Transaction Wrapping on Multi-Step Operations

Invoice creation from work orders (reading labor entries + parts + creating invoice + line items) is not wrapped in a transaction. Concurrent modifications can cause inconsistent invoices.

**Fix:** Use `prisma.$transaction()` for all multi-step create/update flows.

---

### M6. Mobile JWT Has No Issuer/Audience Claims

**File:** `apps/web/app/api/mobile/auth/login/route.ts` (lines 35-45)

The mobile auth JWT is signed but has no `iss` or `aud` claims. If the same AUTH_SECRET is used elsewhere, tokens are interchangeable.

**Fix:** Add `.setIssuer('arsenal-analytics').setAudience('mobile-app')` to the JWT builder.

---

### M7. Invitation Token Enumeration

**File:** `apps/web/app/api/invites/[token]/route.ts`

Different error messages for "not found", "already accepted", and "expired" allow attackers to enumerate valid tokens.

**Fix:** Return a single generic error: `{ error: 'Invalid or expired invite' }` for all failure cases.

---

### M8. Unbounded Database Queries

Several list endpoints (`GET /api/work-orders`, `GET /api/invoices`, `GET /api/parts`) fetch all records for an org with no pagination limit. Large datasets will cause timeouts and memory issues.

**Fix:** Add default `take: 100` and support `?page=&limit=` query params.

---

## Priority Remediation Order

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| **Immediate** | C1 — Fix `resolveOrgId()` in all routes | 2-3 hrs | Blocks all data access abuse |
| **Immediate** | C4 — Remove AUTH_SECRET from docs + rotate | 10 min | Prevents token forgery |
| **Immediate** | C2 — Add CRON_SECRET to cron routes | 15 min | Prevents cron abuse |
| **Day 1** | C3 — Remove demo user backdoor | 15 min | Prevents passwordless login |
| **Day 1** | C5 — Add rate limiting to auth endpoints | 2 hrs | Prevents brute force |
| **Day 1** | H1 — Add role checks to API routes | 2-3 hrs | Enforces RBAC |
| **Day 1** | H2 — Validate callbackUrl | 15 min | Prevents phishing |
| **Week 1** | H3-H10 — Remaining high items | 1-2 days | Defense in depth |
| **Week 2** | M1-M8 — Medium items | 1-2 days | Polish and compliance |

---

## Summary of Counts

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 5 | Must fix before field testing |
| HIGH | 10 | Should fix before field testing |
| MEDIUM | 8 | Fix during stabilization |
| **Total** | **23** | |
