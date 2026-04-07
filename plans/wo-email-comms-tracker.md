# Work Order Email Communication Tracker — Feature Plan

## Problem Statement

Aviation MRO technicians routinely manage 3–8 open work orders simultaneously.
Each job generates its own email traffic: vendor part status updates, customer
questions, approval requests, warranty claim threads, and AOG coordination
chains. All of this lands in a single inbox with no visible connection to the
work order it belongs to.

**The result:** technicians lose track of which thread belongs to which job,
miss replies that are blocking progress, or spend minutes scanning their inbox
when a customer calls asking for an update.

This feature embeds a lightweight communication log directly inside each work
order so the job and its emails are never separated again.

---

## User Personas

| Persona | Primary pain | What they need |
|---------|-------------|----------------|
| **Field Technician** | "I have 6 jobs open — which thread has the vendor reply for the 182?" | Log emails on the go; see at a glance what needs a reply |
| **Shop Manager** | "Did we follow up on that AOG warranty claim?" | View full comms history when reviewing a job; see pending items |
| **Service Advisor** | "What did we last tell the customer?" | Pull up a complete conversation timeline before a call |

---

## Core Concept: The Communications Tab

A new **Communications** tab is added to the work order detail page alongside
the existing Overview / Labor / Parts / Billing / Compliance / History tabs.

The tab badge shows a live count of threads awaiting a reply so technicians
can scan the WO list and immediately know which jobs need attention.

---

## The WO Reference Tag

Every work order gets a copyable reference tag:

```
[WO-2024-0042]
```

Technicians paste this into the subject line of any email related to that job.
Their email client's search then becomes a zero-effort filter:
`subject:[WO-2024-0042]` surfaces every email instantly.

The tag is displayed prominently in the Communications tab with a one-click
copy button and brief instructions. No integration, no webhooks, no setup.

---

## Feature Components

### 1. Communications Tab (Web — WO Detail Page)

**Tab trigger:** `<Mail />` icon + "Comms" label + badge showing unresolved
thread count (red if any awaiting reply, gray if zero).

**Tab content layout:**

```
┌─────────────────────────────────────────────────────────┐
│  WO Reference Tag                                       │
│  ┌─────────────────────────────┐  ╔══════════════════╗  │
│  │  [WO-2024-0042]   □ Copy   │  ║  + Log Thread    ║  │
│  └─────────────────────────────┘  ╚══════════════════╝  │
│  Add this tag to email subjects for instant inbox       │
│  filtering.                                             │
├─────────────────────────────────────────────────────────┤
│  Filter: [All ▾]  [Awaiting Reply ▾]  [This week ▾]    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │ ● AWAITING REPLY           inbound  2h ago      │    │
│  │ Re: Part status — Lycoming IO-360 cylinder      │    │
│  │ AeroSupply West · james@aerosupplywest.com      │    │
│  │ "Said part ships Thursday but couldn't confirm  │    │
│  │  serial match — need to verify with customer"   │    │
│  │                          [Mark Replied] [···]   │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ✓ REPLIED                  outbound  yesterday  │    │
│  │ Warranty claim — Garmin GTN 750 Xi              │    │
│  │ Garmin Aviation Support · support@garmin.com    │    │
│  │ "Submitted claim #GWC-2024-8841, awaiting RMA"  │    │
│  │                                    [View] [···] │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ℹ FYI ONLY                 inbound   3 days ago │    │
│  │ Customer approval — Squawk #3 additional work   │    │
│  │ John Smith · jsmith@skylineair.com              │    │
│  │ "Approved the additional inspection. Go ahead." │    │
│  │                                    [View] [···] │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

### 2. Log Thread Dialog

Triggered by the **+ Log Thread** button. Designed to be completable in
under 30 seconds on mobile.

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| Subject | Text input | Paste email subject line |
| Direction | Toggle | **Received** / **Sent** |
| Status | Select | Awaiting Reply / Replied / Resolved / FYI Only |
| Contact name | Text | Auto-suggests from customer + vendor contacts on this WO |
| Contact email | Text (email) | Optional but surfaced in the card |
| Date/time | DateTime | Defaults to now; editable |
| Notes | Textarea | Paste excerpt, key info, or action needed |

**Smart defaults:**
- Direction defaults to "Received" (most common case for logging)
- Status defaults to "Awaiting Reply" when Direction = Received
- Status defaults to "Replied" when Direction = Sent
- Contact suggestions drawn from `WorkOrder.customer.email` and any
  `PurchaseOrder.vendor` contacts already on the WO

**Validation:** Subject is the only required field. Everything else is
optional so techs can log in 5 seconds if needed.

---

### 3. Thread Card Detail (Expand / Edit)

Clicking a card expands it inline (or opens a sheet on mobile) to show:
- Full notes text
- Edit controls (all fields editable)
- Status change buttons (large tap targets for mobile)
- Delete option (with confirmation)

---

### 4. Work Order List — Pending Replies Indicator

The WO list cards (and the mobile tab) gain a small "mail" badge when any
thread on that WO has `status = AWAITING_REPLY`. This surfaces the pending
work without the technician having to open each job.

```
┌────────────────────────────────────────┐
│ WO-2024-0042  ● IN PROGRESS     ✉ 2   │
│ Cessna 182 N4421K — Cessna Owner       │
│ Opened Oct 14 · Est. close Oct 21      │
└────────────────────────────────────────┘
```

The `✉ 2` badge means 2 threads awaiting a reply on this job.

---

### 5. Mobile App (Expo) — Communications Screen

Inside the work order detail screen on mobile, a **Comms** section appears
below the existing task list.

**Mobile-optimized interactions:**
- Swipe right on a thread card → **Mark Replied** (green confirmation flash)
- Swipe left → **Edit**
- Tap **+** FAB (floating action button) → Log Thread sheet slides up
- Badge count shown on the WO list row

The Log Thread sheet on mobile uses large tap targets, and the Status field
is a horizontal button row (not a dropdown) for one-thumb operation:

```
  [AWAITING ✓]  [REPLIED]  [RESOLVED]  [FYI]
```

---

## Data Model

### New Prisma model: `WorkOrderCommunication`

```prisma
model WorkOrderCommunication {
  id           String      @id @default(cuid())
  orgId        String
  org          Organization @relation(fields: [orgId], references: [id])
  workOrderId  String
  workOrder    WorkOrder   @relation(fields: [workOrderId], references: [id], onDelete: Cascade)

  subject      String
  direction    CommDirection   // INBOUND | OUTBOUND
  status       CommStatus      // AWAITING_REPLY | REPLIED | RESOLVED | INFO_ONLY
  contactName  String?
  contactEmail String?
  notes        String?
  occurredAt   DateTime    @default(now())

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  createdById  String?
  createdBy    User?       @relation(fields: [createdById], references: [id])

  @@index([workOrderId, status])
  @@index([orgId, status])
}

enum CommDirection {
  INBOUND
  OUTBOUND
}

enum CommStatus {
  AWAITING_REPLY
  REPLIED
  RESOLVED
  INFO_ONLY
}
```

**Relationship to add on `WorkOrder` model:**
```prisma
communications WorkOrderCommunication[]
```

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/work-orders/[id]/communications` | TECHNICIAN+ | List all threads for a WO |
| POST | `/api/work-orders/[id]/communications` | TECHNICIAN+ | Log a new thread |
| PATCH | `/api/work-orders/[id]/communications/[comId]` | TECHNICIAN+ | Edit subject/status/notes |
| DELETE | `/api/work-orders/[id]/communications/[comId]` | MANAGER+ | Remove a thread entry |

The GET response includes a `pendingCount` summary field for use by the WO
list badge.

---

## UX States & Edge Cases

| State | Handling |
|-------|---------|
| No threads logged yet | Empty state: illustration + "Log your first email thread" CTA with short explanation of the WO tag |
| All threads resolved | Friendly "All caught up" message with green check |
| Long notes text | Truncated to 3 lines on card; full text in expanded view |
| Duplicate subject | No deduplication — intentional, since the same subject can have multiple rounds of back-and-forth logged separately |
| WO closed | Comms tab still viewable (read-only) for historical reference |

---

## Implementation Phases

### Phase 1 + 2 — Ship Together (field testing)
Mobile ships simultaneously with web given technicians are the primary persona.

1. DB migration: add `WorkOrderCommunication` model + enums
2. API routes: GET, POST, PATCH, DELETE
3. Web: Communications tab + Log Thread dialog
4. Web: WO list pending-reply badge
5. WO reference tag copy button
6. Mobile: Comms section in WO detail screen
7. Mobile: Log Thread bottom sheet
8. Mobile: Swipe gestures (mark replied / edit)
9. Mobile: Badge on WO list row

### Phase 3 — Power Features (post field testing)
10. Optional email forwarding address
    (`wo-2024-0042@replies.shop.com` → auto-creates INBOUND log entry)
11. Reminder notifications: push alert if AWAITING_REPLY > 4 hours
12. Bulk-resolve all threads on WO close
13. Export communications log to PDF with invoice

---

## Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Who can delete a thread entry? | MANAGER+ only |
| 2 | Do FYI threads count toward the pending badge? | No — AWAITING_REPLY only |
| 3 | Mobile priority? | Ship Phase 1 + 2 simultaneously |
| 4 | Character limit on notes? | 2,000 characters |
| 5 | Contact suggestions scope? | Linked-only (customer + vendors already on this WO) |
