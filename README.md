# Donor Success — Platform

This is the actual logged-in product (donor CRM, health scoring, pipeline,
dashboards) — separate from the marketing site. Typically deployed at
`app.donorsuccess.com`, with the marketing site at `donorsuccess.com`.

## Latest: branded the AI as "Jarvis"

No schema change, no new functionality — a naming/branding pass across
every AI touchpoint in the app, applied consistently rather than to
just one spot:

- **Nav label**: "Insights" → "Jarvis" (same icon, same `/insights`
  route — didn't rename the URL itself, since renaming a route this
  soon after shipping it risks breaking a link or bookmark for no real
  benefit over just relabeling what's shown)
- **The chat itself**: page heading, empty-state heading, input
  placeholder, and the loading state all now say Jarvis. Assistant
  message bubbles got a small "Jarvis" label above them, so it reads
  as a named assistant answering, not an unlabeled chat bubble.
- **System prompt updated to establish the actual persona** — not just
  a UI label slapped on top of unchanged behavior. Told explicitly to
  go by "Jarvis," with one deliberate carve-out: if asked directly
  what AI model or technology is actually running underneath, it
  should answer honestly rather than deny it. The product name and the
  underlying technology are two different questions, and only the
  first one should be "Jarvis."
- **Executive Briefing card** on the dashboard: "Executive Briefing" →
  "Briefing from Jarvis" — the other place in the app where AI-written
  content shows up, now consistent with the chat.

## Latest: AI Insights chat

**⚠️ Schema change — requires a migration.** New models: `ChatSession`,
`ChatMessage`, new enum `ChatRole`. Run:
```bash
npx prisma db push
```

**⚠️ Reuses the existing `ANTHROPIC_API_KEY` and `SUPPORT_CHAT_MODEL`
env vars** — no new environment variables needed if the Executive
Briefing cron is already configured; this uses the exact same client
setup and model fallback (`claude-sonnet-4-6`).

### What this actually is

A dedicated `/insights` page (new nav item) where someone can ask
plain-language questions about their organization's own donor data —
retention, giving trends, at-risk donors, pipeline, volunteer impact —
and get an answer grounded in real numbers, not a plausible-sounding
guess.

**Architecture**: an interactive tool-calling loop (`lib/insights/chat.ts`),
genuinely different from the one-shot prompt the Executive Briefing
uses. Claude reads the question, decides which of six read-only tools
it needs (`lib/insights/tools.ts`), the backend executes that exact
query — always through `forOrg()`, the same tenant isolation used
everywhere else in the app — and the result goes back to Claude to
write the final answer. Capped at 5 tool-call rounds per question, so
a confused loop can't burn API cost indefinitely on one message.

**Every tool is read-only by design.** There is no path from this
chat to creating, editing, or deleting anything — a deliberate scope
limit for a first version, and the system prompt explicitly tells
Claude to say so if asked to take an action rather than answer a
question.

**Reuses existing, already-tested logic wherever it could**:
`get_retention_rate` calls the exact same `calculateDonorRetentionRate`
function the Retention report already uses; the pipeline and giving
tools use the same stage constants and date-window logic as their
report counterparts. The new work was exposing these as callable
tools and building the interactive loop around them, not writing new
query logic from scratch.

**Access**: same as the underlying reports — Fundraiser role and up.
A Viewer would just be seeing the same data through a different door,
so there's no reason to expand exposure through chat specifically.

**Conversation history** is stored (`ChatSession`/`ChatMessage`) so a
page refresh doesn't lose the thread — deliberately minimal, storing
which tools were used per answer (for the "Checked donor retention
data" transparency chips in the UI) but not full tool call/response
payloads, since that would mean re-storing donor data outside the
tables that are supposed to be the actual source of truth for it.

## Latest: Contacts is now its own tab

No schema change — this was a real UI problem, not a broken feature.
The "Add contact" button existed and worked correctly the whole time
(confirmed by re-checking the panel's code directly), but the Contacts
panel was buried inside the "Relationships" tab, sharing space with
the relationship graph, volunteer hours, and affiliations — four
panels stacked in one tab, easy to miss.

Contacts is now its own top-level tab, positioned right after
Relationships, next to Overview and Gifts & Pipeline. Shown only for
Organization/Foundation/Corporation donors, matching the same
`isOrgType()` check that already gated the panel — an Individual or
Household donor's page doesn't get an empty Contacts tab that wouldn't
make sense for them.

## Latest: Driver/Dreamer/Doer engagement style + Success Hub updates

**⚠️ Schema change — requires a migration.** New enum:
`EngagementStyle` (DRIVER, DREAMER, DOER), new field:
`DonorContact.engagementStyle`. Run:
```bash
npx prisma db push
```

### Added alongside the existing Contact Type, not replacing it

Contacts on Organization/Foundation/Corporation donors already had a
`ContactType` classification (Executive, Influencer, Donor, Advocate)
— that's about a person's *role*. Driver/Dreamer/Doer is a genuinely
different axis: how someone is actually best cultivated, regardless of
their title. Added as a second, independent field rather than
replacing the existing one, since a contact can be both an Executive
*and* a Driver — these describe different things about the same
person, not alternatives.

- **Driver** — wants to see results and make the decision; lead with
  data and a clear ask
- **Dreamer** — responds to vision and the mission's big picture; lead
  with story and impact
- **Doer** — wants to be hands-on and involved; lead with a specific
  way to participate, not just a gift ask

Shows as a badge next to Contact Type on the donor page's Contacts
panel, and as a second dropdown in the add/edit contact form.

### Success Hub updated for both this and last round's volunteer hours

- **Donor Contacts and Affiliations** article updated with the
  Engagement Style explanation above
- **New article: "Tracking volunteer hours"** — what it's for, the
  GAAP reasoning for keeping it separate from Gifts, how the
  Independent Sector rate works and why past entries don't
  retroactively change, and its effect on health scoring
- **Standard reports** article updated to list the Volunteer Impact
  report, which existed in the app already but hadn't been documented
  yet

## Latest: logo update + volunteer hours completed (health scoring, Settings, new report)

### Logo

`components/layout/Logo.tsx` swapped from the old inline placeholder SVG
to the real logo asset (same file shared from the marketing site's
`public/logo-header.png`). Favicon files (`favicon.ico`, `icon.svg`,
`apple-icon.png`) also replaced with the same official set used there.

### Volunteer hours — worth being direct about what was already here

Most of this feature already existed in the codebase before this round —
the `VolunteerHours` model, the Independent Sector rate constant and
resolver (`lib/volunteer.ts`), the full CRUD actions
(`lib/actions/volunteer.ts`), the donor-page panel, and the Settings rate
override form were all already built, and well — matching the exact
reasoning discussed (hours as their own record type, deliberately
separate from `Gift` for GAAP reasons, the hourly rate locked in
per-entry rather than read live). What was genuinely missing, and what
this round actually added:

1. **The Settings rate override form existed but wasn't wired in
   anywhere** — `VolunteerRateForm.tsx` had no page rendering it. Now on
   the main Settings page.
2. **No health-score integration** — volunteer hours weren't factored
   into donor health scoring at all. Added as an **additive-only** boost
   to the existing engagement factor: a donor with 6+ logged
   interactions and zero volunteer hours scores exactly as before (no
   regression), while hours provide a real boost on top, capped so
   volunteering alone can't push a score above what full engagement
   already allows. Caught and fixed a real type error this surfaced — a
   third call site (`prisma/seed.ts`) also calls `computeHealthScore`
   directly and needed updating too, alongside the already-known
   `recalculate.ts` caller.
3. **No Volunteer Impact report** — new `/reports/volunteer-impact`:
   total hours and estimated value (12-month and all-time), top
   volunteers, a monthly trend chart, CSV export. Added to the main
   Reports list.

This build covers the **data model and auth foundation** everything else
gets built on top of.

## Stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **PostgreSQL** via **Prisma** — multi-tenant schema in `prisma/schema.prisma`
- **Auth.js (NextAuth v5)** — email/password to start, structured for OAuth later
- **Tailwind CSS** — same brand tokens as the marketing site

## Data model

Every donor-facing table (`Donor`, `Gift`, `Campaign`, `Interaction`,
`Opportunity`, `Task`, `HealthScoreSnapshot`, `AuditLog`, `Invitation`,
`User`) carries an `organizationId`. One `Organization` = one nonprofit =
one tenant.

```
Organization
 └─ User (role: OWNER | ADMIN | FUNDRAISER | VIEWER)
 └─ Donor
     ├─ Gift
     ├─ Interaction
     ├─ Opportunity (major gifts pipeline)
     ├─ Task
     └─ HealthScoreSnapshot (immutable history, for trend charts)
 └─ Campaign
 └─ AuditLog
 └─ Invitation (pending teammate invites)
```

Money fields use `Decimal(12,2)`, never `Float` — donation amounts should
never be subject to floating-point rounding. `Donor.healthScore`,
`retentionRisk`, `lifetimeGiving`, etc. are cached/denormalized fields
meant to be recalculated by a scoring job (not yet built) and read cheaply
everywhere else; `HealthScoreSnapshot` is the source-of-truth history for
how those numbers were derived over time.

### Why tenant isolation is enforced in the query layer, not just by convention

`lib/tenant-db.ts` exports `forOrg(organizationId)`, a Prisma Client
Extension that automatically merges `organizationId` into every
read/write against a tenant-scoped model:

```ts
const db = forOrg(session.user.organizationId);
await db.donor.findMany(); // WHERE organizationId = '...' — always, automatically
await db.donor.create({ data: { firstName: 'Alice' } }); // organizationId injected
```

Every future feature (Donor CRM, Pipeline, Campaigns) should be built
against `forOrg(...)`, never the raw `prisma` client, for anything
donor-related. That makes cross-tenant data leaks a structural
impossibility rather than something that depends on every engineer
remembering a `where` clause. The raw `prisma` export from `lib/db.ts` is
reserved for genuinely pre-tenant operations: looking up a user by email
during login, creating a new `Organization` at signup.

## Auth

- `auth.config.ts` — edge-safe config (no Prisma/bcrypt). Used by
  `middleware.ts`, which runs on the Edge runtime and can't import
  Node-only packages. Contains the `authorized()` callback that decides
  which routes require a session, and the `jwt`/`session` callbacks that
  put `organizationId` + `role` on every session.
- `auth.ts` — full config, adds the Credentials provider (Prisma + bcrypt
  password check). Only ever runs in the Node runtime (route handlers,
  server actions).
- `middleware.ts` — protects every route except `/login`, `/register`,
  and the auth API routes.
- `lib/permissions.ts` — `Role` rank helpers (`hasRole`, `permissions.*`,
  `assertRole`) for gating actions by Owner/Admin/Fundraiser/Viewer.

Registering (`app/(auth)/register/page.tsx` → `registerAction`) creates a
new `Organization` and its first `User` as `OWNER` in a single
transaction, then signs them in.

## Getting started

```bash
cp .env.example .env
npm install
```

Fill in `.env`. **If you're using Neon:** grab both connection strings
from your project's Connect page — the pooled one (host has `-pooler`
in it) goes in `DATABASE_URL`, the direct one goes in `DIRECT_URL`.
Migrations need the direct connection; the running app uses the pooled
one. (Using local/Docker Postgres instead? Point both env vars at the
same connection string — see the comments in `.env.example`.)

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

```bash
npx prisma migrate dev --name init
npm run db:seed         # optional: demo org + 3 donors
npm run dev
```

Seed login (if you ran `db:seed`):
- Owner: `owner@harborlight.example` / `Password123`
- Fundraiser: `fundraiser@harborlight.example` / `Password123`

The seed also computes real health scores for the sample donors (rather
than leaving them null) and creates one demo Success Plan on the
highest-value donor, so both features have something to look at
immediately instead of starting from empty.

### Neon-specific notes

- **First connection can be slow.** Neon's free tier suspends its
  compute after inactivity; the first query after a while wakes it back
  up, which can take a few seconds. If `prisma migrate dev` seems to
  hang the first time, give it 10–15 seconds before assuming it's stuck.
- **Keep `?sslmode=require`** on both connection strings — Neon requires
  TLS, and Prisma will fail to connect without it.
- **Wrong connection string is the #1 migration failure.** If
  `prisma migrate dev` errors with something about prepared statements
  or "connection pooling," you've likely got the pooled URL in
  `DIRECT_URL` by mistake — double-check against Neon's Connect page.

> **Note on this build:** the sandbox this was built in only allows
> network access to npm/GitHub — Prisma's engine binaries are hosted at
> `binaries.prisma.sh`, which isn't reachable there, so `prisma generate`
> couldn't run in that environment. Every file was still verified: the
> schema was hand-reviewed relation-by-relation, `next-auth`'s actual
> installed type definitions were checked against every callback
> signature used here, and the full app was type-checked twice — once
> normally (confirming the *only* errors were missing Prisma-generated
> enum types) and once with hand-written stub types matching the schema's
> enums exactly, which produced **zero** TypeScript errors. Run
> `npx prisma generate` as your first step and everything will resolve.

## What's built so far

**Foundation:** multi-tenant data model, Auth.js email/password, role-based
access control, query-layer tenant isolation via `forOrg()`.

**Donor CRM** (`/donors`):
- List view — search by name/email, filter by retention risk, paginated
- Create / edit — `components/donors/DonorForm.tsx`, single form component
  reused by both, routes through one `saveDonorAction`
- Detail view — profile header, cached giving stats, and two live panels:
  - **Gifts** — logging a gift (`lib/actions/gifts.ts`) updates the
    donor's cached `lifetimeGiving`, `giftCount`, `firstGiftDate`,
    `lastGiftDate`, and `largestGift` in the same transaction, so those
    fields can never drift from the underlying `Gift` rows
  - **Interactions** — a donor touchpoint timeline (calls, emails,
    meetings, notes...)
  - Opportunities and Tasks render read-only if any exist, with a
    "coming soon" note — those are the next modules to build
- Delete — Admin+ only, confirms before removing a donor and everything
  under them (cascades via the schema's `onDelete: Cascade`)

All of it is gated by `lib/permissions.ts`: Viewers can look but not
touch; Fundraisers can create/edit; only Admin+ can delete.

**Major Gifts Pipeline** (`/pipeline`):
- Kanban board across all six `OpportunityStage`s (Identification →
  Cultivation → Solicitation → Stewardship → Closed Won / Closed Lost),
  each card showing donor, ask amount, expected close date, and owner
- Per-card stage dropdown moves an opportunity between stages instantly
  (`updateOpportunityStageAction`) — no drag-and-drop library, same
  direct-server-action-call pattern used throughout
- Summary bar: open pipeline value (sum of ask amounts still in an open
  stage), and a **weighted forecast** — ask amount × probability, where
  probability defaults per-stage (10/25/50/75/100/0%) if not set
  explicitly on the opportunity (`lib/pipeline.ts`)
- Create/edit as a full page (`OpportunityForm`, with a donor picker) or
  inline from a donor's profile (`InlineOpportunityForm`, donor
  pre-filled) — both funnel through one `saveOpportunityAction`, same
  create-vs-update-via-hidden-id pattern as donors
- Closing an opportunity (moving it to Closed Won/Lost) stamps
  `closedAt`; moving it back out clears it

**Tasks** (`/tasks`):
- List view, filterable by **My tasks / All tasks** and **Open / Done /
  All**, sorted by due date (undated tasks sort last), overdue items
  shown in red
- Checkbox toggle marks a task done/reopened instantly
  (`toggleTaskStatusAction`) — no separate edit flow needed for the most
  common action
- Create/edit as a full page (`TaskForm`, with optional donor and
  opportunity linking) or inline from a donor's or an opportunity's
  detail page (`InlineTaskForm`, that relation pre-filled and hidden) —
  both funnel through `saveTaskAction`
- Unlike donor/opportunity saves, `saveTaskAction` does **not** redirect
  — tasks are usually jotted down mid-review on someone else's page, and
  bouncing to `/tasks` would break that flow. The standalone new/edit
  pages navigate back to the list themselves once the client sees a
  successful result. This is a deliberate deviation from the
  donor/opportunity pattern, documented in the action's doc comment.
- Deletion is Fundraiser+ (not Admin-only like donors/opportunities) —
  a task is someone's personal to-do, lower stakes than donor data

**Campaigns** (`/campaigns`):
- Grid view with status filter (Planning / Active / Completed / Archived),
  each card showing a progress bar against `goalAmount`
- Detail page: accurate gift count and unique-donor count (queried
  directly, not derived from the capped 50-row display list — a real
  campaign can have thousands of gifts), plus the 50 most recent gifts
  with donor links
- **Gift logging now has a campaign selector.** `GiftForm` on the donor
  page gained a `campaignId` field, and `createGiftAction` keeps
  `Campaign.raisedAmount` in sync in the same transaction as the donor's
  cached giving stats — same reasoning as before: a cached rollup field
  is only safe if it's updated in lockstep with the rows it summarizes
- Deletion is blocked with a clear message (not a raw DB error) if the
  campaign still has gifts attached — the schema doesn't cascade or
  null out `Gift.campaignId` on delete, so this is checked explicitly
  before attempting it. Archiving (via the status field) is the
  intended path for a campaign that's over

## What's built

All four core modules from the original plan are in: **Donor CRM**,
**Major Gifts Pipeline**, **Tasks**, and **Campaigns** — on top of the
multi-tenant data model and auth foundation. Plus three more:

**Health scoring** (`lib/scoring/`):
- `health-score.ts` — a transparent RFM-style algorithm: recency (35%),
  frequency (20%), monetary (25%), engagement (20%), each scored 0–100
  and blended into the donor's `healthScore` and `retentionRisk`. Weights
  and thresholds are named constants with comments, not magic numbers —
  this is the kind of logic a real org will want to tune, and it should
  be obvious where.
- `recalculate.ts` — recomputes and persists a donor's score, plus an
  immutable `HealthScoreSnapshot` for history. Runs **automatically**
  inside the same transaction as logging a gift or an interaction (both
  change the inputs to the score), and there's a manual "Recalculate"
  button on the donor page for donors who haven't had recent activity
  but whose recency factor has quietly decayed.
- This is what turns the "Not yet scored" badges from the CRM module
  into real signal.

**Settings** (`/settings`, Admin+ only):
- Organization profile (name, timezone)
- Team table: role changes and activate/deactivate, inline, per row
- Invite-by-email flow: generates a token, shown as a copyable link
  (no email service wired up yet — see the code comment for where to
  add one) with a 7-day expiry
- `/accept-invite/[token]` — the invitee's side: validates the token
  (expired / already used / invalid all handled with distinct
  messages), creates their account **inside the inviting org** rather
  than a new one, and signs them in
- Guardrails baked into the actions, not just the UI: an Admin can't
  grant or revoke Owner access (only another Owner can), nobody can
  deactivate their own account, and the last active Owner in an org
  can't be demoted or deactivated

**Donor Success Plans** (`/donors/[id]/plan/...`, `/plans`) — the
donor-centric counterpart to a customer success plan:
- A plan tracks where a donor sits in the **Donor Success Framework™**
  (Attract → Engage → Cultivate → Grow → Retain → Advocate → Legacy),
  an objective, strategy notes, a target ask amount/date, a review
  cadence, and an owner
- A milestone checklist per plan (add / check off / delete — same
  pattern as Tasks)
- A summary card on the donor detail page shows the active plan's
  stage, target, and milestone progress at a glance, or a "Create a
  Success Plan" prompt if there isn't one yet
- `/plans` is the cross-donor view — every active plan across the
  organization, sortable by status, showing stage, target, milestone
  progress, next milestone due, and owner. This is the "book of
  business" view a fundraiser or ED would actually use in a pipeline
  review meeting.
- One plan is `ACTIVE` at a time per donor in the UI (the summary card
  only surfaces the most recently updated active one), but the schema
  allows plan history — a donor can have `COMPLETED`/`ARCHIVED` plans
  from prior years sitting alongside the current one

## Deployment (Vercel)

Live on Vercel, connected to Neon. A few things specific to this setup:

- **`postinstall: "prisma generate"`** in `package.json` — required.
  Vercel does a fresh `npm install` on every build; without this, the
  generated Prisma Client (code matching the current schema) never gets
  created on the build server and the app fails at runtime.
- **Environment variables** to set in the Vercel project (Settings →
  Environment Variables), same names as `.env.example`: `DATABASE_URL`,
  `DIRECT_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (set to the actual deployed
  URL), `CRON_SECRET`.
- **A note on a type-checking gap this surfaced:** `forOrg()`'s
  `create()` calls inject `organizationId` at runtime, but Prisma's
  *generated* type for `.create()` still requires it in the `data` you
  pass — the extension changes behavior, not the type signature. Every
  `create()` call in `lib/actions/` explicitly includes
  `organizationId: session.user.organizationId` for exactly this reason
  (redundant at runtime, required for the real compiler). If you add a
  new `create()` call against a `forOrg()` client, it needs the same
  treatment or the Vercel build will fail with a "Property
  'organization' is missing" type error even though the code works fine
  locally in a dev server that skips strict type-checking.

## Health scoring: automatic + scheduled

Scores recalculate three ways:
1. **Automatically** when a gift or interaction is logged (same
   transaction — see `lib/actions/gifts.ts` / `interactions.ts`)
2. **Nightly, for every donor in every organization** — Vercel Cron
   (`vercel.json`) hits `/api/cron/recalculate-scores` once a day. This
   is what catches donors who've gone quiet: recency decays even without
   new activity, and nothing else would ever re-trigger that donor's
   score. The route is protected by `CRON_SECRET` (checked as a Bearer
   token) rather than a user session — set that env var in Vercel or the
   cron will get a 401.
3. **Manually** — a "Recalculate all donor scores" button on `/settings`
   (Admin+), for anyone who doesn't want to wait for the nightly run.
   Same underlying `recalculateOrgDonorScores()` the cron uses,
   scoped to just the acting admin's own org.

`lib/scoring/bulk.ts` processes donors in batches of 10 concurrently
rather than one giant `Promise.all` — matters once an org has real
donor counts, so it doesn't try to open hundreds of simultaneous
database connections at once.

**Vercel plan note:** Cron on the Hobby plan is limited to once-daily
schedules. The `0 6 * * *` schedule in `vercel.json` (6am UTC) is
already daily, so this works on Hobby as-is — but if you ever want more
frequent recalculation, that needs a Pro plan.

## Visual design pass

Login, register, and the dashboard got a real design treatment rather
than the functional-but-plain baseline everything shipped with:

- **`components/auth/BrandPanel.tsx`** — the split-screen brand panel on
  login/register (hidden below the `lg` breakpoint, where the form
  takes the full screen instead). The animated node network is the
  brand's established "Impact Network" motif from the marketing site's
  brand kit, not a new invention — same signature, reused deliberately
  so the transition from marketing site → login feels like one product.
  Pure CSS keyframe animation (`app/globals.css`), no new dependency;
  respects `prefers-reduced-motion`.
- **Dashboard** rebuilt around a real information hierarchy instead of
  the leftover "foundation checklist" scaffolding text: a personalized
  greeting (using the org's own `timezone` field, not server time), four
  stat cards, a "Donor Health Overview" segmented bar as the page's
  visual anchor (this is deliberately the centerpiece — health scoring
  is what actually differentiates this product, so the dashboard should
  say that at a glance), then upcoming tasks and recent gifts side by
  side.
- `fade-up` keyframe (also in `globals.css`) gives cards a staggered
  entrance on load — subtle, one-time, not looping.

## Retention rate, donor segments, Next Best Actions, executive summary

**⚠️ Schema change — requires a new migration.** `Donor.segment` went
from a free-text `String?` to a proper `DonorSegment` enum
(`INDIVIDUAL` / `CORPORATE` / `PHILANTHROPIC`), and `Donor` gained an
`executiveSummary` field. Run this before anything else after pulling
these changes:
```bash
npx prisma migrate dev --name donor_segments_and_summary
```
Since local dev points at the same Neon database as everything else in
this project (no separate dev/prod split yet), this applies directly to
your real data. Any donor with a free-text segment value that isn't
exactly `Individual`, `Corporate`, or `Philanthropic` would fail this
migration — worth a quick check if you've been hand-editing segment
values; the demo data never used anything but `null`, so this should be
a clean migration either way.

- **Donor retention rate** (`lib/metrics/retention.ts`) — the dashboard's
  most prominent tile now. Standard nonprofit formula: of donors who
  gave in the prior 12-month period, what percentage gave again in the
  most recent 12-month period. Rolling windows, not calendar/fiscal
  year, so it's meaningful regardless of when it's viewed. Color-coded
  against the ~45% sector-average benchmark (not enforced anywhere, just
  UI context).
- **Donor segments** (`DonorSegment` enum) — a simpler, high-level
  grouping than `DonorType` (which is about legal/entity structure).
  Filterable on the donor list, editable via a dropdown (not free text
  anymore) on the donor form.
- **Next Best Actions** (`lib/insights/next-best-actions.ts`) — **this
  is a rules engine, not an LLM call.** Worth being direct about that:
  it surfaces prioritized, donor-specific suggestions (retention risk,
  contact recency, overdue tasks, opportunity/milestone timing, annual
  renewal windows) using deterministic logic against the donor's actual
  data — fast, free, and predictable. If genuine LLM-generated
  natural-language recommendations are wanted later, that's a layer
  that could sit behind the same `NextBestActionsPanel` component
  without changing how it's consumed elsewhere.
- **Executive summary** — a short, inline-editable brief on each donor
  page (`components/donors/ExecutiveSummaryCard.tsx`) meant to be
  read by an ED or board member right before a call. Plain text,
  editable by Fundraiser+, visible to everyone with donor access.

## Password reset

No email service exists yet, and a truly self-service "forgot password"
flow can't be done securely without one (the whole point of emailing a
reset link is proving the requester owns that inbox — skipping that
step would let anyone reset anyone else's password just by knowing
their email). So this ships as three pieces instead:

- **Admin-initiated reset** (`/settings`, per team member row) — an
  Admin+ generates a one-time link and copies it to send directly
  (Slack, text, whatever). Fully self-contained, no email needed.
  Same Owner-protection rule as role changes: an Admin can't reset an
  Owner's password, only another Owner can.
- **Self-service request** (`/forgot-password`, linked from the login
  page) — a user requests a reset. It doesn't email anything (nothing
  to email through yet); instead it shows up under **Settings →
  Pending password resets** for an Admin to grab the link and send it
  to that person. Always returns the same generic confirmation message
  regardless of whether the email matched an account — standard
  practice, avoids leaking which emails have accounts.
- **Change your own password** (`/settings`, bottom section) — for a
  logged-in user who just wants to update their password. No email
  involved at all, since entering the *current* password is itself the
  identity check.

Reset tokens reuse the `VerificationToken` model that was already in
the schema (standard Auth.js boilerplate, previously unused) — no
migration needed for this feature. Tokens expire after 1 hour and are
deleted immediately on use (single-use, no replay).

**When real email gets wired up later**, the only thing that needs to
change is `requestPasswordResetAction` in `app/(auth)/actions.ts` —
send the link instead of just creating the token. Everything else
(the reset-completion page, the admin flow, the Settings list) stays
exactly as-is.

## Data import

`/donors/import` (Admin+, linked from the "Import CSV" button on the
Donors list) is a chooser between two wizards, both sharing the same
3-step shell — **upload → map columns → review & import** — and the
same underlying components (`components/import/UploadStep.tsx`,
`MapStep.tsx`, `ReviewStep.tsx`, `DoneStep.tsx` all take `fields`/
`requiredFields`/`importAction` as props rather than being hardcoded to
one import type, specifically so a third import type can reuse this
shell later without duplicating the wizard UI).

- **Upload & parse** happens entirely client-side (`papaparse`) — the
  file never leaves the browser until you actually confirm the import,
  so you can safely try a file and back out without touching the
  database.
- **Column mapping** auto-guesses from your file's actual headers
  (`suggestMapping()` in `lib/import/shared.ts`, driven by an aliases
  list per field) — you review/correct it rather than mapping every
  column by hand. Works with exports from Salesforce, HubSpot,
  Blackbaud, StratusLive, Andar, or a plain spreadsheet.

### `/donors/import/donors` — donor records

- **Required per row: (First name + Last name) OR Organization name,
  plus Gift amount and Gift date always.** Evaluated *per row*, not per
  file — `IDENTITY_PATHS` in `lib/import/donor-fields.ts` defines the
  two acceptable identity paths, so a single file can mix individual
  and organization donors. `donorType` is inferred the same way:
  Organization name present (and no explicit Donor Type column)
  defaults that row to `ORGANIZATION`, otherwise `INDIVIDUAL`.
- **Import** (`lib/actions/import.ts`) bulk-creates via `createMany`.
  Rows missing a required field are skipped with the specific field(s)
  named; rows whose email already exists in the org are also skipped,
  to avoid duplicates.

### `/donors/import/gifts` — gift history

- **Matches gifts to existing donors by email** — this does not create
  donors, so run donor import first. A row whose email doesn't match
  any donor in the org is skipped with that reason.
- **Required per row:** Donor email, Gift amount, Gift date. Optional:
  Gift type, Payment method, Fund, Notes.
- **No duplicate-gift detection** — unlike donor import, there's no
  reliable natural key for "is this the same gift" (two legitimate $100
  gifts from the same donor on the same day are indistinguishable from
  an accidental double-import). Re-running the same file will
  double-count; the review step warns about this explicitly.
- **Bulk-efficient by design** (`lib/actions/import-gifts.ts`): all
  gifts insert in one `createMany` call, and each affected donor's
  cached totals (lifetime giving, gift count, first/last gift date,
  largest gift) update in **one query per donor, not per gift** — a
  5,000-row file against 200 donors is ~200 update queries, computed by
  accumulating per-donor deltas in memory while walking the rows, then
  applying them in batches of 10 concurrent after the main insert.

### Both wizards

- **Health scores are not computed during import** — a bulk import can
  be thousands of rows, and scoring all of them inline risks the
  request timing out. The results screen points at the existing
  "Recalculate all" button on Settings instead; that's a separate,
  already-built request with its own timeout budget (`maxDuration = 60`
  on both import routes too).
- Capped at 5,000 rows per file (`MAX_ROWS` in each action file) — a
  defensive limit, not a hard technical ceiling.
- Gated at **Admin+**, one tier above regular donor edit — bulk
  operations are a bigger-consequence action than editing one record.

**Not built yet:** native live-sync connections to any specific CRM
(Salesforce/HubSpot/Blackbaud all have real APIs and would each be
their own OAuth-based integration project — CSV import was the
foundational piece that works today regardless of which of those get
built next, or in what order).

## Master Admin Console

**⚠️ Schema change — requires a migration.** `User` gained
`isPlatformAdmin`, and a new `CrmConnection` model + two enums
(`CrmProvider`, `CrmConnectionStatus`) were added for the Salesforce
work below. Run before anything else:
```bash
npx prisma db push
```

`/admin` (deliberately dark-themed, so it's visually unmistakable from
the regular app) is a cross-organization console for provisioning new
customers — gated by `isPlatformAdmin`, a flag that's completely
separate from the per-organization `Role` system. Almost no account
should ever have this set to `true`.

- **Two layers of gating**: the middleware (`auth.config.ts`) blocks
  any request to `/admin/*` before it reaches a page unless the session
  carries `isPlatformAdmin`, and `app/admin/layout.tsx` checks again —
  same "never rely on one gate" pattern as the regular `(app)` layout.
- **`lib/actions/admin.ts` is the only place in the codebase where
  operations cross into an organization other than the acting user's
  own.** Every function starts with `requirePlatformAdmin()`. This
  boundary is deliberately kept in its own file rather than generalizing
  the existing `lib/actions/settings.ts` actions to optionally accept a
  cross-org override — much easier to audit "is this safe" when
  cross-tenant access lives in exactly one file.
- **Creating a customer reuses the existing invite system** rather than
  generating a temporary password: the console creates the
  `Organization`, then an `Invitation` (role `OWNER`) for their first
  user, and shows a copyable link — same secure "set your own password"
  flow that already existed, not a new parallel one.
- **`CrmConnection` and its cross-org admin-console queries use the raw
  `prisma` client, not `forOrg()`.** This model has a *compound* unique
  key (`organizationId` + `provider`), and the tenant-scoping
  extension's behavior with compound keys (as opposed to simple ones
  like `id`) hasn't been verified against a real Prisma engine in this
  environment. Given the stakes of getting tenant isolation right, every
  query here writes `organizationId` explicitly by hand instead of
  relying on an untested assumption.
- **Seeded access**: `npm run db:seed` now also creates a
  `Donor Success (Internal)` organization with one user —
  `admin@donorsuccess.example` / `Password123` — with
  `isPlatformAdmin: true`, specifically so the console itself is
  testable. Deliberately separate from the Harborlight demo org, which
  exists to exercise the product's own features, not the admin console.
- A small "Admin Console" pill appears in the regular app header, but
  only for accounts with `isPlatformAdmin` set.

## Reports

`/reports` (all roles, including Viewer — reporting is read-only) — five
standard reports, each with a CSV export:

1. **Donor Retention** (`/reports/retention`) — extends
   `lib/metrics/retention.ts` (already powering the dashboard tile) with
   the actual retained/lapsed donor lists, not just the headline rate.
2. **Giving Summary** (`/reports/giving-summary`) — last 12 months by
   month and by segment.
3. **Donor Segmentation** (`/reports/segmentation`) — donor count and
   lifetime giving by segment and by donor type.
4. **Major Gifts Pipeline** (`/reports/pipeline`) — open value, weighted
   forecast, and win rate by stage, reusing the same
   `effectiveProbability()` logic as the Pipeline board.
5. **Lapsed & At-Risk Donors** (`/reports/at-risk`) — HIGH/CRITICAL
   retention risk donors sorted by urgency, meant as a direct outreach
   worklist (donor names link straight to their profile).

`components/reports/DownloadCsvButton.tsx` is a small, fully
client-side CSV export — no server round trip, just serializes the
data the page already fetched into a Blob and triggers a browser
download. Reused identically across all five reports.

**These 5 reports were picked as a reasonable standard set**, not
specified in advance — swapping one out or adding a 6th is a matter of
adding another page under `app/(app)/reports/` and a card on the
landing page, not a structural change.

## Salesforce sync (Phase 2: pull, one-way)

**⚠️ Schema change — requires a migration.** Nullable sync-tracking
fields: `Donor.salesforceContactId`, `Donor.salesforceAccountId`,
`Opportunity.salesforceId`, `Gift.salesforceOpportunityId` (each with a
compound unique index on `(organizationId, ...)` — safe with nulls,
since Postgres never treats two NULLs as conflicting in a unique index,
so donors/opportunities/gifts created directly in the app are
completely unaffected), plus `CrmConnection.accountBackfillCompletedAt`
(see the Accounts section below for why this exists). Run:
```bash
npx prisma db push
```

Phase 1 (connection only — OAuth handshake, encrypted token storage)
was built earlier; Phase 2 (this) adds the actual sync logic on top of
it, first for Contacts/Opportunities only, later extended to also
cover Accounts.

### What actually happens

`lib/sync/salesforce-sync.ts` is the whole thing:

1. **Contacts → Donors** (individuals). Matched by `salesforceContactId`.
2. **Accounts → Donors** (organizations/foundations/corporations).
   Matched by `salesforceAccountId`, created as `DonorType.ORGANIZATION`.
   **Filters out NPSP's "Household Account" record type** — NPSP
   (Nonprofit Success Pack, common for orgs like United Way affiliates)
   automatically creates one of these behind *every* Contact, and
   without this filter every individual donor would also show up a
   second time as a spurious organization. The filter checks
   `RecordType.Name` (a standard Salesforce field, safe to query whether
   or not NPSP is installed) rather than any NPSP-specific field, so
   this works the same for NPSP and non-NPSP orgs alike.
3. **Opportunities → Opportunities.** Matched by `salesforceId`. Stage
   mapping is a real limitation worth understanding: Salesforce
   `StageName` is fully custom per org, so there's no fixed set of
   values to map from. `IsClosed`/`IsWon` (standard booleans on every
   org) definitively decide Closed Won/Lost; anything still open gets a
   **best-effort keyword guess** (`mapStage()`) at which of the 4 open
   stages it corresponds to. This will misfire on unusual custom stage
   names — a real per-customer stage-mapping config is the correct
   long-term fix.
4. **Closed Won Opportunities → Gifts**, exactly once per Opportunity
   (tracked via `salesforceOpportunityId`, so re-running sync never
   double-counts a gift).
5. **Donor attribution for an Opportunity, in order of preference:**
   - The standard `OpportunityContactRole` object (`WHERE IsPrimary =
     true`) — not an NPSP-specific field, so this works whether or not
     NPSP is installed. Preferred when present, since crediting a
     specific person is usually more precise than crediting an
     organization.
   - **Falling back to the Opportunity's `AccountId`** (a standard field
     on every Opportunity, no special setup required) when there's no
     primary contact role — this is what recovers giving history for
     corporate/organizational gifts that were never going to have an
     individual contact role in the first place.
   - If neither resolves to a donor already in this app, the
     Opportunity is skipped and listed with a specific reason, not
     silently dropped.
6. **Incremental**: only pulls records where `LastModifiedDate` is
   after the last successful sync, with a 5-minute overlap as a
   clock-skew guard. First sync ever pulls everything.

### The Account backfill — why it's not just "incremental like everything else"

Account syncing was added after Contact/Opportunity syncing already
existed, which creates a real problem: a connection that's already been
running incrementally would only pick up Accounts *modified since its
last sync* — silently never syncing any of a customer's pre-existing
Accounts at all. `CrmConnection.accountBackfillCompletedAt` tracks
whether the one-time full historical pull has happened yet; until it
has, the Account query uses "since the beginning of time" instead of
the normal incremental window, then marks itself done. Every sync after
that first one behaves normally. This runs automatically — nothing to
trigger manually, but worth knowing why the first sync after upgrading
might take noticeably longer than usual if there are many Accounts.

### Where it runs

- **Manual**: Settings → Salesforce → **Sync Now**
  (`syncSalesforceNowAction`), results shown inline (created/updated
  counts, skipped records with reasons).
- **Scheduled**: `/api/cron/sync-salesforce`, daily at 5am UTC — *before*
  the 6am health-score recalculation cron, deliberately, so scores
  reflect freshly-synced data rather than being one day stale.

### What this is not (yet)

This is **pull-only** — nothing here writes back to Salesforce. A
donor edited in Donor Success won't appear in Salesforce. Real
bidirectional sync needs conflict resolution (what happens when the
same record changes in both systems between syncs) and is a
meaningfully bigger, separate piece of work — see Phase 3/4 discussed
when this was originally scoped.

## Email integration (Gmail / Outlook)

**⚠️ Schema change — requires a migration.** Two new models
(`EmailConnection`, `EmailTemplate`) and a new enum (`EmailProvider`).
Run before anything else:
```bash
npx prisma db push
```

### The key architectural decision: per-fundraiser, not per-organization

Unlike the Salesforce `CrmConnection` (one connection shared by the
whole org), `EmailConnection` is scoped to a single `User`. When Sam
emails a donor, it needs to come from *Sam's* inbox — so replies land
with Sam, so it doesn't look like bulk mail from a shared address. Each
fundraiser connects their own Gmail or Outlook account individually,
under **Settings → Email integration**.

### Setup required on your end (I can't do this part for you)

**Google (Gmail):**
1. [Google Cloud Console](https://console.cloud.google.com) → create or
   select a project → **APIs & Services → Library** → enable the
   **Gmail API**
2. **APIs & Services → OAuth consent screen** → configure it (External
   or Internal depending on your Google Workspace setup)
3. **APIs & Services → Credentials → Create Credentials → OAuth client
   ID** → Application type: **Web application**
4. Add an **Authorized redirect URI**:
   `https://your-deployed-url.vercel.app/api/integrations/gmail/callback`
   (and `http://localhost:3000/api/integrations/gmail/callback` for
   local testing)
5. Copy the **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`

**Microsoft (Outlook):**
1. [Azure Portal](https://portal.azure.com) → **App registrations →
   New registration**
2. Under **Redirect URI**, add (type: Web):
   `https://your-deployed-url.vercel.app/api/integrations/outlook/callback`
   (and the `localhost:3000` equivalent for local testing)
3. **Certificates & secrets → New client secret** — copy the value
   immediately, it's only shown once
4. **API permissions → Add a permission → Microsoft Graph → Delegated
   permissions** → add `Mail.Send` and `User.Read`
5. Copy the **Application (client) ID** and the client secret value into
   `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`

Also required either way: `CRM_TOKEN_ENCRYPTION_KEY` (same one used for
the Salesforce connection — reused here too, since both are "encrypt an
OAuth token at rest" with identical requirements).

### What's built

- **`lib/integrations/gmail.ts`** / **`outlook.ts`** — OAuth flow (same
  signed-`state` CSRF pattern as Salesforce), token exchange, and —
  unlike Salesforce's Phase 1 — **real token refresh logic**, since
  sending actually needs a valid token, not just a stored one.
- **`lib/integrations/email-send.ts`** — the unified entry point:
  resolves a user's connection, refreshes the access token first if
  it's expired (persisting the new one), then dispatches to whichever
  provider they're connected to. Nothing else in the codebase should
  call `gmail.ts`/`outlook.ts` directly for sending — go through this.
- **Email templates** (`/settings/email-templates`, Admin+) — shared
  across the org, each optionally tagged with a retention risk tier
  and/or a campaign. This tagging is a *suggestion*, not a restriction:
  on the donor page, tagged templates sort to the top (marked with a ★)
  but every template stays selectable regardless of the donor in front
  of you.
- **Merge fields** (`lib/email-templates.ts`) — `{{firstName}}`,
  `{{lastName}}`, `{{donorName}}`, `{{organizationName}}`,
  `{{fundraiserName}}`. Rendered client-side the moment a template is
  selected, before sending — so what the fundraiser sees in the compose
  box is exactly what goes out, no server-side surprise substitution.
- **"Send email" on the donor page** — only rendered if the donor has
  an email address. If the fundraiser hasn't connected an account yet,
  it shows a message pointing at Settings instead of a broken compose
  form.
- **Sending automatically logs an Interaction** (type `EMAIL`) and
  triggers a health score recalculation in the same transaction —
  exactly like manually logging an interaction does. The send happens
  *before* the log — a failed send never produces a false record
  claiming contact happened.

### Deliberately out of scope for this round

- **Plain text only** — no rich HTML formatting in templates or
  compose. Reasonable v1 simplification; HTML support would mean a
  richer compose UI and MIME multipart construction for Gmail.
- **No inbox/read access** — the OAuth scopes requested are
  intentionally send-only (`gmail.send`, `Mail.Send`), not
  `gmail.readonly` or `Mail.Read`. This app cannot see anything in a
  fundraiser's inbox, only send through it.
- **No bulk/batch sending** — one donor, one email, one click. A "send
  this template to everyone matching X risk tier" feature would be a
  real (and reasonable) next step, but is a meaningfully bigger scope
  (rate limiting, a send queue, unsubscribe handling) than this round.

## My View / Whole Organization toggle

**⚠️ Schema change — requires a migration** (bundled with the other three features below; one `db push` covers all of it):
```bash
npx prisma db push
```

A shared toggle (`components/shared/ViewScopeToggle.tsx`, `?scope=mine|all` in the URL) on Dashboard, Donors, and Pipeline — Fundraisers default to **My View** (their own assigned donors/pipeline), everyone else defaults to **Whole Organization**, via `lib/scope.ts`'s `resolveScope()`. The explicit query param always wins over the default, for any role.

**Deliberately NOT scope-aware**: Upcoming Tasks and the new "Needs your attention" panel on the dashboard — both stay personal regardless of the toggle. A fundraiser's dashboard showing every other fundraiser's tasks even in "Whole Organization" view would be noise, not oversight; an org-wide task view already exists on the Tasks page itself with its own toggle.

`calculateDonorRetentionRate()` (`lib/metrics/retention.ts`) now takes an optional `assignedToId` — "My View" shows the retention rate for *your* donors specifically, not the org's.

## Donor Contacts (organization/foundation/corporation donors)

New `DonorContact` model — the actual people at an org-type donor (their CEO, philanthropy director, whoever champions your cause there), distinct from the Donor record itself. Shown as its own panel on a donor's page, **only when that donor's type is Organization, Foundation, or Corporation** (`lib/donor-types.ts`'s `isOrgType()`).

Each contact can be tagged with a **Contact Type** — Executive, Influencer, Donor, or Advocate (`lib/contact-types.ts`) — and one contact per donor can be marked **Primary**. Setting a new primary automatically un-marks any previous one; this is enforced in `saveDonorContactAction`, not left to the UI to get right.

## Campaign sub-types and visibility

- **Sub-campaigns**: a campaign can nest under a parent (e.g. "Direct Mail Appeal" under "2026 Annual Fund") via `Campaign.parentCampaignId`. One level deep by convention — the schema doesn't enforce a hard limit, but the campaign forms only offer top-level campaigns as parent options, and a campaign can't be set as its own parent or create a two-item cycle (checked in `saveCampaignAction`).
- **Visibility**: `visibleToAll` (default true) restricts a campaign to specific fundraisers via `assignedFundraisers` (implicit many-to-many with `User`) when unchecked. Fundraisers only see campaigns that are org-wide or specifically assigned to them, both in the campaigns list and — enforced, not just hidden from the list — on a restricted campaign's own detail page. Owner/Admin/Viewer always see everything, since restricting oversight roles from a campaign hidden from most fundraisers wouldn't serve the point of the restriction.

## Donor Affiliations

**⚠️ Schema change — requires a migration** (bundled with the WealthEngine fields below; one `db push` covers both):
```bash
npx prisma db push
```

Free-text-first by design: `DonorAffiliation.affiliateName` is always required and always shown, since most affiliated organizations (an employer, a family foundation) won't already exist as their own Donor record here. `affiliatedDonorId` is an optional bonus link — only set when the affiliated entity *is* also a donor in this system — enabling direct navigation between the two records. Shown on every donor's page regardless of donor type (unlike Contacts, which is Organization/Foundation/Corporation-only), tagged with a type: Employer, Board Member, Family Foundation, Subsidiary, Parent Company, or Other.

## WealthEngine (Altrata) wealth screening

**Settings → WealthEngine**, Admin+ only. Genuinely different shape from every other integration in this app:

- **API key, not OAuth.** WealthEngine doesn't have a self-serve OAuth flow — access is purchased directly through their sales team (`wealthengine.com`, now an Altrata company), who provide a straight API key. There's no free trial with real data; their public sandbox explicitly returns dummy profiles, not real ones.
- **Per-organization, like Salesforce** — one connection covers the whole team, not per-fundraiser like email.
- **Every screen has a real dollar cost.** There is deliberately no bulk-screen-everyone button anywhere in this app, and no automatic/scheduled screening. Screening only ever happens one donor at a time, from an explicit button click on that donor's page, gated to Admin+ specifically (not Fundraiser+) to keep spend under someone's direct control.

**⚠️ Important honesty about accuracy**: `lib/integrations/wealthengine.ts`'s response parsing (`parseProfileResponse()`) is built from WealthEngine's *published* API documentation — field names like `profile.wealth.netWorth`, `profile.giving.capacity`, `profile.scores.p2g` — not verified against a real account's actual response, since building this didn't have access to a paid WealthEngine account to test against. Once you have real credentials:
1. Connect in Settings, screen one donor you don't mind testing with
2. Check the raw response — it's saved in full on `Donor.wealthScreeningRaw` (a JSON column) even before the mapped fields are corrected, specifically so nothing is lost if the initial field mapping is wrong
3. Adjust `parseProfileResponse()`'s field paths to match what you actually see, if they don't line up

## Settings page access — a bug fixed along the way

While wiring in WealthEngine, found that `/settings` was gated entirely to Admin+ at the page level — meaning **Fundraisers couldn't reach the page at all**, which meant they could never reach the per-fundraiser Gmail/Outlook connection built earlier, defeating the point of that feature. Fixed: the page is now reachable by every role, but individual sections are gated appropriately — Organization profile, Team, Invitations, Pending resets, Data & Scoring, Salesforce, and WealthEngine stay Admin+ only (conditionally rendered, not page-level redirected), while **Change your password** and **Email integration** are visible to everyone, since those are personal settings, not organizational ones.

## Transactional email (Resend) — password resets now actually send

Password reset requests (`requestPasswordResetAction`) now send a real email via [Resend](https://resend.com), instead of only creating a token someone had to manually copy from Settings.

### Setup

1. Sign up free at resend.com (3,000 emails/month, no card required)
2. **API Keys → Create API Key** → copy it into:
   ```
   RESEND_API_KEY="re_..."
   ```
3. **Optional but recommended before real customers see these emails**: without `EMAIL_FROM` set, mail sends from Resend's shared test address (`onboarding@resend.dev`) — works immediately, but looks unprofessional and will hurt deliverability at any real volume. To send from your own domain: Resend dashboard → **Domains → Add Domain** → add the SPF/DKIM DNS records they give you → once verified:
   ```
   EMAIL_FROM="Donor Success <noreply@donorsuccess.com>"
   ```

### Design choices worth knowing

- **A send failure never blocks the reset flow or changes what the user sees.** The token is created regardless of whether the email actually goes out, and the existing "Settings → Pending password resets" manual-copy-link fallback still works if Resend is ever down or misconfigured — this was deliberate, not an oversight.
- **The response message is identical whether or not the email exists** (unchanged from before) — still avoids leaking which emails have accounts.
- Templates live in `lib/email/templates/` — currently just `password-reset.ts`. Invitation emails (currently still copy-link-only, same as Salesforce/Gmail-style connections) would be a natural next template to add here, using the exact same `sendEmail()` helper.

## Two one-off scripts (not app features — run directly against the database)

Both intentionally have **no UI** — they exist for exactly the "you're locked out with no other admin around" situation, not for routine use:

- **`scripts/grant-platform-admin.ts <email>`** — grants cross-organization admin access. Creates an account (via a real invitation, not a temp password) if the email doesn't have one yet; safe to run twice.
- **`scripts/reset-password.ts <email> <newPassword>`** — sets a password directly, bypassing the reset-token flow entirely. Enforces the same password rule the app itself uses (10+ characters, one uppercase, one number).

Run either with `npx tsx scripts/<name>.ts ...` — same as the seed script.

## Bulk team import (CSV) + invitation emails now send too

**Settings → "Or import several teammates at once from a CSV"** (or `/settings/import-team` directly), Admin+. Reuses the exact same generic Upload/Map/Review/Done wizard steps as donor and gift import — same UX, same underlying components.

**The one thing worth understanding about how this works**: a row **never** creates a `User` directly — it creates an `Invitation`, exactly like the single "Invite a teammate" form already did. This was a deliberate consistency choice, not the easy path: generating temporary passwords for a whole CSV of people would have been simpler to build, but it's worse security practice than letting each person set their own password, and it would have meant bulk-imported teammates onboard differently than everyone else. Columns:

- **Name** (optional) — not stored anywhere (`Invitation` has no name field; the person sets their own name when they accept) — used only to personalize the invitation email greeting
- **Email** (required) — validated, deduplicated within the file, and checked against both existing accounts and existing pending invitations before creating anything
- **Role** (optional) — defaults to Fundraiser if blank or not a recognized role name

**As part of this, invitation emails now actually send** — both from bulk import and from the original single-invite form in Settings, using the same Resend setup wired up for password resets. Same non-blocking philosophy: a send failure never rolls back an invitation that was already created, and the copyable link in the UI remains a fallback either way.

## Success Hub (formerly "Help Center" — renamed, same feature)

`/help` — reachable by every logged-in role, linked from the main nav. No schema changes; this is entirely static content, not database-backed.

- **`lib/help/content.ts`** — every article lives here as plain data (title, category, summary, and a small set of structured content blocks: heading/paragraph/list/steps/callout). Adding or editing an article is a content change in this one file, not a UI change.
- **`/help`** — searchable (client-side, filters on title/summary/category) and browsable by category.
- **`/help/getting-started`** — a separate, dedicated onboarding checklist distinct from the reference articles, written to actually walk a brand-new customer through setup in the order it matters (connect email → bring in donor data → connect Salesforce → invite team → assign donors → dashboard → templates). Each step links straight to the relevant part of the app.
- **`/help/[slug]`** — individual article pages, with a "More in this category" list at the bottom.

20 articles currently, covering every major feature area built so far. Since this is plain data rather than a CMS, keeping it current means remembering to add an article (or update an existing one) whenever a genuinely new feature ships — nothing enforces that automatically.

## Self-serve billing (Stripe) — Starter & Growth only

**⚠️ Schema change — requires a migration.** New fields on `Organization`:
`stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`,
`billingPeriod` (all nullable — Enterprise orgs, provisioned manually
through the Master Admin Console, never populate these at all). Run:
```bash
npx prisma db push
```

### Setup

1. Stripe Dashboard → **Developers → API keys** → copy the secret key into `STRIPE_SECRET_KEY`
2. **Product catalog** → create two Products (Starter, Growth), each with
   two recurring Prices (monthly, annual) — four Price IDs total, into
   `STRIPE_PRICE_{STARTER,GROWTH}_{MONTHLY,ANNUAL}`
3. **Developers → Webhooks → Add endpoint** → `{your-app-url}/api/webhooks/stripe`
   → select `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted` → copy the signing secret into `STRIPE_WEBHOOK_SECRET`
4. On the marketing site, the pricing page's Starter/Growth buttons now
   link straight to `{platform-app-url}/signup?plan=X&period=Y` instead
   of the Contact form. Enterprise is unchanged — still routes to Contact.

### How provisioning actually works

The flow deliberately does **not** trust the browser redirect back from
Stripe as the signal that payment succeeded — a webhook is the only
thing that creates an organization:

1. `/signup` collects organization name, owner name/email, and the
   chosen plan/period, then `createCheckoutSessionAction`
   (`lib/actions/signup.ts`) creates a Stripe Checkout Session with that
   info stored in `metadata`, and redirects to Stripe's hosted page.
2. `/signup/success` is just a "we're setting things up, check your
   email" page — it doesn't create anything itself, since by the time
   the browser redirects here the webhook may not have fired yet. This
   is a deliberate design choice: trusting the redirect instead of the
   webhook would let anyone visit the success URL directly and get a
   free organization without ever paying.
3. `app/api/webhooks/stripe/route.ts` verifies Stripe's signature, and
   on `checkout.session.completed` creates the actual `Organization` +
   an `Invitation` (role `OWNER`) — the same invite-based onboarding
   every other path in this app uses, not a directly-created account
   with a password. Sends the invitation email via the same Resend
   setup used everywhere else.
4. `customer.subscription.updated` / `.deleted` keep `subscriptionStatus`
   in sync going forward (renewals, payment failures, cancellations).
5. **Idempotent** — Stripe redelivers webhook events, sometimes more
   than once for the same event. Before creating anything, the handler
   checks whether an organization already exists for that
   `stripeSubscriptionId`.
6. **Invitation attribution**: same situation as `scripts/grant-platform-admin.ts` —
   there's no logged-in session in a webhook to credit as the inviter,
   so it's attributed to whichever user has `isPlatformAdmin` set.

### Self-serve billing management

**Settings → Billing** shows the current plan, billing period, and
subscription status, with a **Manage Billing** button (only shown when
`stripeCustomerId` exists, i.e. never for Enterprise) that opens
Stripe's hosted Billing Portal — update payment method, view invoices,
or cancel, entirely without needing to contact support.

### Known gap worth knowing about

**No enforcement yet.** If a subscription goes `past_due` or gets
canceled, `subscriptionStatus` updates correctly and shows in Settings,
but nothing currently locks the organization out of the app itself.
Building real enforcement (a banner, then a read-only mode, then a hard
lock after some grace period) is a reasonable and fairly contained
next step, but is a genuine product-policy decision (how long a grace
period, what "locked" actually restricts) rather than something to
guess at.

### The `/register` overlap — resolved

`/register` has been removed entirely (page, action, schema, and the
public-route/middleware entries referencing it) — decided against
keeping a free instant-signup path alongside the paid one. The login
page's "Don't have an account?" link now points at `/signup` instead.

## Grace period & data deletion for lapsed self-serve subscriptions

Policy (both figures live in one place, `lib/billing-policy.ts`,
not scattered across files):

- **2-day grace period** — once a subscription enters `past_due`,
  `canceled`, `unpaid`, or `incomplete_expired`, the organization keeps
  full access for 2 days, with a persistent warning banner ("Fix now →
  Settings") on every page.
- **Locked after 2 days** — every route under `(app)` renders a single
  "Account restricted" screen instead of its normal content, with a
  Manage Billing button built right into that screen (no need to
  separately reach Settings — the fix action is right there).
- **Data deleted after 45 days total** (not 45 days after the lock —
  45 days from the same moment the grace period started). A daily cron
  (`/api/cron/delete-canceled-organizations`) finds organizations past
  that mark and deletes them.

**⚠️ This deletion is real and irreversible.** A few things built in
deliberately given that:

- **The clock only starts on a genuine status change**, not every
  webhook redelivery — `subscriptionStatusChangedAt` only updates when
  `subscriptionStatus` actually differs from what's already stored, so
  Stripe redelivering the same event doesn't reset (or advance) the
  timer.
- **Reactivating stops the clock entirely** — the moment status returns
  to `active`, the org is no longer in the at-risk status set at all,
  so it's never a deletion candidate regardless of history.
- **A warning email sends the moment trouble starts** (`lib/email/templates/subscription-issue.ts`),
  to every active Owner/Admin on the org, not just whoever originally
  signed up — stating both the 2-day and 45-day numbers explicitly.
  Only sent on the *transition into* trouble, not on every subsequent
  at-risk webhook for the same ongoing issue.
- **Every deletion is logged individually, by name and ID, before it
  happens** — `console.log` right before the `delete()` call, not
  batched — specifically so there's an audit trail for something that
  can't be undone.
- **Enterprise organizations are structurally exempt** — they have no
  `subscriptionStatus` at all (always `null`, provisioned manually,
  never touch Stripe), so `getEnforcementState()` always returns fully
  healthy for them by construction, not by a special-case check.

Given this is a new cron, you're now at **3 total** — worth checking
your Vercel plan's cron job limit before deploying, since Hobby-tier
accounts have historically capped this lower than Pro.

## Success Sequences

**⚠️ Schema change — requires a migration.** Four new models:
`SequenceTemplate`, `SequenceTemplateStep`, `DonorSequenceEnrollment`,
`DonorSequenceStepLog`, plus a `SequenceEnrollmentStatus` enum and a new
back-relation on `EmailTemplate`. Run:
```bash
npx prisma db push
```

### What this deliberately is not

This is **not automation** — every single step still requires a
fundraiser to explicitly click Send. Nothing in this feature ever
contacts a donor without a human reviewing that specific message first.
It's a queuing and surfacing layer on top of infrastructure that
already existed (`EmailTemplate`, the donor email-send action, merge
fields) — reused almost entirely as-is via a new shared helper,
`sendAndLogDonorEmail()` in `lib/actions/send-email.ts`, extracted from
the existing donor-page compose action specifically so both paths
(manual compose and sequence steps) share the identical
send-then-log-then-recalculate behavior rather than two versions
drifting apart over time.

### The concept

- **`SequenceTemplate`** (Admin-managed, Settings → Success sequences) —
  a reusable playbook: a name plus an ordered list of steps, each step
  = an existing Email Template + a day offset (0, 7, 30, ...). Can
  optionally be tagged with `suggestedForRisk` — same loose-targeting
  pattern as `EmailTemplate.suggestedForRisk` — to *suggest* itself on
  a matching donor's page. Suggestion only; never auto-enrolls anyone.
- **`DonorSequenceEnrollment`** — one donor enrolled in one template at
  a time (a donor can have historical COMPLETED/ENDED_EARLY enrollments,
  but only ever one ACTIVE one — enforced in `startSequenceAction`,
  not via a DB constraint, since Prisma has no partial/conditional
  unique index). Tracks `currentStepOrder` — which step is due next.
- **`DonorSequenceStepLog`** — one row per step actually sent, the real
  audit trail (separate from `currentStepOrder`, which just tracks
  "what's next" — the log is "what actually happened, and when").

### Where it shows up

- **Settings → Success sequences** — build/edit templates, with a
  dynamic step builder (add/remove steps, pick a template + day offset
  for each)
- **A donor's page** — `SuccessSequencePanel`: shows the active
  enrollment's steps (sent = checked off, current = highlighted with a
  Send button, upcoming = queued), or if none is active, any suggested
  sequences plus a "start a different sequence" picker
- **The Dashboard** — `SequenceStepsDuePanel`, always personal
  regardless of the My View toggle (same reasoning as Upcoming Tasks
  and Needs Your Attention): every currently-due step across *all* of
  the viewer's assigned donors, in one place, so working through
  stewardship is an actual daily queue instead of remembering to check
  individual donor pages

### A few implementation details worth knowing

- **Due-date computation happens in application code, not SQL** — each
  step's due date is `enrollment.startedAt + step.dayOffset`, which
  varies per step, so there's no single stored due-date column to
  filter on directly. Both the donor page and dashboard fetch active
  enrollments and compute due-ness in JS.
- **`EmailTemplate` deletion is now `Restrict`-protected** if it's used
  in any sequence step — `deleteEmailTemplateAction` checks for this
  first and returns a specific message rather than a raw database
  error. Same protection on deleting a `SequenceTemplate` that has any
  enrollment history, even fully completed ones.
- **Editing a template's steps after donors are mid-sequence** is a
  known, accepted edge case for this version — `DonorSequenceStepLog`
  preserves what was actually sent regardless of later edits, but a
  step reorder/removal could shift what a mid-sequence donor sees next.
  Worth keeping in mind rather than editing an in-flight template's
  step list casually.

## Starter email templates & sequences

No schema change — this is pure content plus wiring into existing provisioning paths.

`lib/provisioning/starter-content.ts` defines 5 email templates and 2
Success Sequences built from them:

- **Thank You for Your Gift**, **Annual Impact Update**, **We've Missed
  You** (tagged `suggestedForRisk: HIGH`), **Welcome & Thank You**,
  **Just Checking In**
- **New Major Donor Welcome** (3 steps: welcome → impact update at day
  14 → check-in at day 45)
- **At-Risk Donor Recovery** (2 steps: reconnect → follow-up at day 14,
  suggested automatically for HIGH-risk donors)

**Runs automatically for every new organization going forward** —
wired into both provisioning paths (Master Admin Console's
`createOrganizationAction` and the Stripe webhook's self-serve
signup), so nobody has to remember to add this manually for a new
customer. Best-effort in both places: a failure here never blocks the
organization itself from being created.

**For organizations that predate this feature** (like United Way of
the Midsouth) — Settings → Success sequences → **"Load starter
templates & sequences"** does the same thing on demand.

**Idempotent by name** — safe to click more than once, or to have run
automatically and then manually: anything that already exists (matched
by exact name) is skipped rather than duplicated, so it's safe to use
as a "fill in anything missing" action too.

## Grants Management — Phase 1 (pre-award pipeline)

**⚠️ Schema change — requires a migration.** Two new models —
`GrantOpportunity`, `GrantRequirement` — plus a `GrantStage` enum. Run:
```bash
npx prisma db push
```

### Why this is a new model, not an extension of Opportunity

Grants start out looking like a major-gift Opportunity (a Foundation
or Corporation donor, an ask, a pipeline of stages), but a genuinely
new model was used rather than adding grant-specific fields onto the
existing `Opportunity` table — grants have their own shape (a
requirements checklist for the application, and eventually a
fundamentally different post-award obligation structure) that would
have meant a lot of grant-only fields sitting null on every regular
major-gift opportunity.

### What's actually here

- **`/grants`** — the pipeline list: Researching → LOI Submitted →
  Proposal Submitted → Awarded/Declined, with ask amount, relevant
  date, and requirements-complete count per grant.
- **A `GrantOpportunity`** is tied to a Foundation/Corporation/Organization
  donor (enforced in the action, not the schema — Prisma has no way to
  restrict a relation to a subset of rows by another field) and has one
  owner for this phase: `grantWriterId`. A second role,
  `complianceOwnerId`, is coming in Phase 2 once there's a
  post-award compliance plan for someone to own — Phase 1 only has the
  one person managing the application.
- **`GrantRequirement`** — a simple checklist per grant (name, optional
  due date, complete/incomplete), fully custom per opportunity since
  every funder's application requirements are different.
- **Declining a grant** prompts for an optional reason, stored on the
  record — shown on the detail page once declined.
- **Dashboard → "Grant deadlines"** — always personal (same reasoning
  as Needs Your Attention and Sequence Steps Due), showing whichever
  date is most urgent per grant: the earliest incomplete requirement,
  or the grant's own application/decision date if nothing's tracked yet.
  **Overdue and due-soon are distinct severities, not just different
  copy** — a missed grant report is treated as a meaningfully bigger
  problem than a donor going quiet, which is the whole point of
  surfacing this prominently in the first place.

### What's coming in Phase 2 (not built yet)

- Converting an Awarded grant into an actual tracked `Grant` record —
  award amount, grant period, restricted-use notes
- Linking grant disbursements to real `Gift` records, so awarded money
  correctly rolls into lifetime giving totals and the funder's donor
  health score
- The **Grant Compliance Plan** — the actual post-award deliverable
  tracking (interim reports, final reports, site visits), with its own
  `complianceOwnerId` distinct from the grant writer, since these are
  frequently different people with a real handoff between them

## Grants Management — Phase 2 (award conversion + compliance)

**⚠️ Schema change — requires a migration.** Two new models —
`Grant`, `GrantMilestone` — plus a nullable `grantId` on the existing
`Gift` model for disbursement linkage. Run:
```bash
npx prisma db push
```

### The conversion, and why it's a deliberate separate step

Setting a `GrantOpportunity`'s stage to Awarded does **not** automatically
create a `Grant` — its detail page instead shows a "Convert to a tracked
grant" form. This is intentional: converting is the real handoff moment,
where the grant writer's job (winning the money) ends and a
**separate compliance owner** takes over the ongoing reporting
obligations. Making it an explicit action with its own form (award
amount, grant period, restricted-use notes, who's taking on compliance)
reflects that this is a genuine transition, not just a status flip.

### What's new

- **`Grant`** — one-to-one with the `GrantOpportunity` it was converted
  from (`Restrict` on delete — an awarded grant's history shouldn't be
  deletable by deleting the original application record). Carries
  `grantWriterId` (kept from the opportunity) and a new
  `complianceOwnerId` — two distinct roles, since these are frequently
  different people.
- **`GrantMilestone`** — the compliance plan itself: interim reports,
  a final report with financial reconciliation, a funder-requested site
  visit, whatever that specific award requires. Deliberately separate
  from `GrantRequirement` (the pre-award checklist) — missing a
  compliance deadline can jeopardize the actual money, a meaningfully
  higher stake than a missed application requirement.
- **Disbursements** — recording one creates a real `Gift` linked back
  to the `Grant` via `gift.grantId`, using the exact same cached-field
  update pattern as regular gift logging (`lifetimeGiving`, `giftCount`,
  `firstGiftDate`/`lastGiftDate`, `largestGift`, health score
  recalculation) — a grant disbursement is a real gift and should roll
  into the funder's donor record exactly like any other one. A
  multi-year grant paid in installments produces one Gift per
  disbursement, all traceable back to the same Grant.
- **Dashboard → Grant deadlines** now merges two genuinely different
  queues into one sorted list: pre-award requirements (for whoever's
  the grant writer) and post-award compliance milestones (for whoever's
  the compliance owner) — reflecting that these are often different
  people looking at the same panel for different reasons.

## Dashboard panels now hide when there's nothing to show

"Needs your attention," "Sequence steps due," and "Grant deadlines" no
longer render an empty-state message when there's nothing due — they
render nothing at all. A dashboard that's all "nice work, nothing here"
panels stacked on top of each other is worse than one that only shows
what's actually actionable.

## Favicon

`app/icon.png` — reused the exact same file already used as the
marketing site's favicon (Next.js App Router auto-detects this file
convention), so both properties share one consistent brand mark rather
than the platform app having none at all.

## Success Hub — Grants Management article

New category, "Grants," with a full walkthrough covering the whole
lifecycle: the pre-award pipeline, the requirements checklist, why
conversion is a deliberate step, the compliance plan, recording
disbursements, and where deadlines surface. Also linked from the
Getting Started checklist's existing structure.

## Grant document attachments + compliance reporting

**⚠️ Schema change — requires a migration.** New model: `GrantDocument`.
Run:
```bash
npx prisma db push
```

**⚠️ Also requires setup** — this feature needs Vercel Blob storage
connected to the project (`BLOB_READ_WRITE_TOKEN`), see `.env.example`
for the setup steps. Nothing in this feature works without it.

### Document attachments

Documents attach to a `GrantOpportunity` — the LOI you submitted, the
signed award letter, an interim report, supporting financials —
optionally tied to the specific requirement or milestone they satisfy.
Neither set means a general grant-level document.

**A real correction worth knowing about**: the version of `@vercel/blob`
originally specified here (`^0.27.0`) predates real private storage
entirely — that feature only exists starting around the 2.x line,
GA as of June 2026. That's exactly why the type-check initially
flagged `access: 'private'` as invalid — not a stub artifact, a
genuinely too-old dependency. Fixed by upgrading to `^2.3.0`, which is
what's actually installed now. Documents are stored in a **real
private Blob store** — authentication is required for every read and
write at the storage layer itself, not just an unguessable URL.
**The Blob store must be created with "Private" access specifically**
when you set it up in the Vercel dashboard — access mode is chosen at
store-creation time and can't be changed afterward, so double check
this before connecting it. On top of that storage-layer protection,
every document link in the UI still points at
`/api/grants/documents/[id]/download`, a route that separately
re-verifies the requester's session and organization before ever
calling into Blob at all — two independent layers, not one.

**Size limit**: 4MB per file, enforced because server-side uploads
(what this uses) are capped by Vercel's serverless function body
limit of 4.5MB. Compliance documents are almost always well under this
in practice. Larger files would need Vercel Blob's separate
client-upload token-handshake flow — a reasonable fast-follow if that
ever comes up, not something to build on spec now.

### Two new reports

- **`/reports/grant-compliance`** — pick one grant from a dropdown, see
  its full requirements + compliance status: pre-award requirements,
  post-award milestones (with overdue ones called out distinctly),
  disbursement history, and attached documents. Exports to CSV.
- **`/reports/grants-portfolio`** — the aggregate view across every
  grant: total awarded vs. disbursed, a breakdown by stage, overdue and
  due-soon compliance milestone counts, and a full per-grant summary
  table (funder, amount, grant writer, compliance owner, compliance
  progress). Exports to CSV.

Both added to the main `/reports` landing page alongside the five
existing standard reports.

## Grants Phase 3B — Collaboration

**⚠️ Schema change — requires a migration.** New model: `GrantComment`.
Run:
```bash
npx prisma db push
```

Deliberately simple, matching the original scoping: a chronological
notes feed on a `GrantOpportunity`, not real-time chat, threading,
@mentions, or editing. `authorId` is nullable specifically so
system-generated entries (stage changes, milestone completions,
disbursements) can appear in the same feed as manual notes, labeled
"System" rather than a person's name — this wasn't in the original
scope, but it turns the feed into a real activity history rather than
just a comment box, at almost no added cost.

The three existing actions that produce these system entries —
`updateGrantStageAction`, `toggleGrantMilestoneAction` (only on
marking *complete*, not on reverting, to avoid noise from toggling
back and forth), and `recordGrantDisbursementAction` — call a shared,
non-exported helper (`createSystemComment`) right after their own real
work succeeds, so a comment never appears for something that didn't
actually happen.

Deletion is scoped to your own comments only (or any comment, for
Admin/Owner) — system entries can't be deleted by anyone, since
they're meant to be a permanent record.

## Grants Phase 3A — Budget & Expense Tracking

**⚠️ Schema change — requires a migration.** Two new models:
`GrantBudgetLine`, `GrantExpense`. Run:
```bash
npx prisma db push
```

This is the "money out" half of grant tracking — disbursements
(`Grant.gifts`) already handle money coming in. A `GrantBudgetLine` is
a planned allocation ("Program staff salaries," "Materials and
supplies"); a `GrantExpense` is actual spending logged against one,
optionally linked to a receipt via the existing `GrantDocument` system
rather than a separate upload path.

**Over-budget lines are visually distinct, not just a fuller progress
bar** — same design principle as overdue compliance milestones
elsewhere in Grants Management: a line that's spent past its budget is
a different category of problem than one that's simply on track, and
it should look like one at a glance.

Deleting a budget line cascades to any expenses logged against it —
the UI confirms this explicitly before calling the action, so this
isn't a silent surprise.

**Not yet wired into the two grant reports** (Grant Compliance Report,
Grants Portfolio) — that's a natural next small addition, deferred for
now to keep this round scoped to what was actually asked.

## Editing and deleting budget lines, expenses, and disbursements

No schema change — this closes a real gap in what shipped for 3A: budget
lines and expenses had delete but no edit, and disbursements had
neither.

**Budget lines and expenses** — straightforward: `updateGrantBudgetLineAction`
and `updateGrantExpenseAction` just update the row, no cascading
effects to worry about. Inline edit mode in `GrantBudgetPanel`, toggled
per-line/per-expense via a pencil icon.

**Disbursements are a genuinely different case, worth understanding.**
A disbursement is a real `Gift` record, and gifts drive several cached
fields on `Donor` (`lifetimeGiving`, `giftCount`, `firstGiftDate`,
`lastGiftDate`, `largestGift`) plus the health score. Editing or
deleting one can't be handled by simple increment/decrement — if the
gift being changed was the donor's largest, or their first, or their
most recent, finding the correct new value requires looking at what's
left regardless. So both actions recompute all of those fields from
scratch by re-querying every remaining gift
(`recalculateDonorGivingFields` in `lib/scoring/recalculate.ts`), then
recalculate the health score, all inside one transaction.

**This exposed a real, pre-existing gap**: no gift edit or delete
action existed anywhere in the app before this — not just for grant
disbursements, for regular gifts either. `recalculateDonorGivingFields`
was written as a general-purpose helper on purpose, not
grants-specific, so a future regular-gift edit/delete feature (or a
bulk-import correction tool) can reuse it instead of re-deriving this
logic. Regular gift editing/deletion itself is **not built** — only the
grant-disbursement path was actually wired up, since that's what was
asked for this round.

New component: `GrantDisbursementsPanel`, replacing what used to be a
plain unmanaged list on the grant detail page.

## Grant deadline emails + grant-linked tasks

**⚠️ Schema change — requires a migration.** New model
`GrantReminderLog` (plus a `GrantReminderSourceType` enum), and a new
optional `grantOpportunityId` on the existing `Task` model. Run:
```bash
npx prisma db push
```

**⚠️ Also a new (fourth) cron job** — `/api/cron/send-grant-deadline-reminders`,
added to `vercel.json`. Worth checking your Vercel plan's cron limit
before deploying, same note as when the third one was added.

### Deadline emails

Covers everything already shown on the Dashboard's "Grant deadlines"
panel — pre-award requirements and the two `GrantOpportunity` date
fields (grant writer gets these), and post-award compliance milestones
(compliance owner gets these) — now also emailed proactively at 14, 7,
and 3 days out, plus once when something first goes overdue.

**Fixed intervals for v1, not configurable.** GrantFrog lets you pick
your own schedule; that's a real settings UI, deliberately not built
here yet. If different intervals ever come up as a real ask, that's a
contained follow-up, not a rebuild.

**Why `GrantReminderLog` exists, and a real bug it prevented before it
ever shipped**: a daily cron re-running (retry, redeploy, clock drift)
could otherwise send the same "7 days out" notice twice. The unique
constraint is `[grantOpportunityId, sourceType, sourceId, threshold]`
— and `sourceId` is a required, non-null field even for the two
`GrantOpportunity`-level date fields (which use a fixed sentinel
string, `"application_deadline"` / `"decision_expected"`, rather than
null), specifically because **Postgres treats NULL as distinct from
NULL in a unique constraint** — a nullable `sourceId` would have
silently defeated the dedup guarantee for exactly those two cases.
Caught and fixed during scoping, before any code was written against
the wrong version of this field.

**The log entry is created *before* the email send is attempted, not
after** — the opposite ordering from `sendAndLogDonorEmail` elsewhere
in this app, and deliberately so. There, a false "we contacted them"
record is the worse failure mode. Here, a duplicate reminder email is
the worse failure mode, and an occasional silently-missed reminder (if
the send itself fails after the slot is claimed) is the more
acceptable tradeoff.

### Grant-linked tasks

`Task.grantOpportunityId` added exactly like the existing
`donorId`/`opportunityId` pattern — same nullable, `SetNull`-on-delete
shape. Wired in both directions:

- **From a grant's page** — reused the existing `RelatedTasksPanel` /
  `InlineTaskForm` components (already built for donors and
  opportunities) by extending them with an optional
  `grantOpportunityId`, rather than building a new panel from scratch.
- **From the main Tasks list and the standalone task form** — a
  "Grant" selector alongside the existing Donor/Opportunity ones, and
  the task list shows which grant a task belongs to, linked back to it.

## Tabbed layout for Donor and Grant detail pages

No schema change. Both pages had grown into long single-page scrolls
as features accumulated over this build — this reorganizes each into a
persistent header (identity, key stats, stage/status) plus a tab bar
for everything else, matching the GrantFrog reference pattern the
person shared.

**New reusable component**: `components/ui/DetailTabs.tsx` — a small
client component that owns tab-switching state; the actual tab
*content* is server-rendered as before and just passed in as a prop.
This is the same "server data, thin client wrapper for interactivity"
shape used elsewhere in this app (e.g. `DetailTabs` doesn't fetch or
know about donors/grants at all — it's generic and shared by both
pages).

**Grant detail page tabs**: Overview (requirements, notes, award
conversion), Compliance (milestones), Financials (disbursements +
budget), Documents, Notes (the comments/collaboration feed), Tasks.
Compliance and Financials show a plain-language empty state rather
than disappearing entirely when a grant hasn't been awarded and
converted yet — the tab structure stays consistent regardless of
where a specific grant is in its lifecycle.

**Donor detail page tabs**: Overview (executive summary, next best
actions, wealth insights, success sequence, success plan),
Relationships (contacts, affiliations), Gifts & Pipeline, Activity
(interactions, tasks). The header — avatar, contact info, health
score/risk badges, the send-email panel, and the four stat cards —
stays outside the tabs, always visible, matching the reference
screenshot's persistent top section.

## Welcome email for new customers

No schema change. Sent from `acceptInviteAction` — the single place
every invitation gets accepted, regardless of how the organization was
created (self-serve Stripe signup, Master Admin Console provisioning,
or a regular team invite).

**Only sent to the first user of a brand-new organization**, not every
team member invited afterward — checked via a simple `user.count()`
right after account creation: if this is the only user in that org, it's
the one who just brought the whole account into existence, and gets the
welcome email. Everyone invited afterward already has teammates and
doesn't need "welcome to Donor Success" — they need "you've been added
to the team," which the existing invitation email already covers.

**Sent *before* the `signIn()` call, not after** — worth understanding
why, since it's a real gotcha: a successful `signIn()` with
`redirectTo` throws internally to perform the redirect. Any code
placed after a successful call to it never actually runs. The welcome
email had to go between account creation and the sign-in attempt, not
"after everything succeeds" the way it might read naturally.

**Never blocks account creation** — wrapped in its own try/catch;
if the email fails to send for any reason, the person still gets a
working account and lands on their dashboard. A missing welcome email
is a minor inconvenience; a blocked signup over an email provider
hiccup would be a much worse failure.

## Fix: email case-sensitivity bug in login/password reset

No schema change to the database structure, but **existing data needs
a one-time backfill — see the last step below, this is not optional.**

### The actual bug

Postgres does case-sensitive exact-match comparison by default. Emails
were never normalized to a consistent case anywhere in this app —
meaning an account created as `Jayharron1@gmail.com` (capital J, H)
could never be found by a later login or password-reset attempt typed
as `jayharron1@gmail.com`. The lookup would simply come back empty,
and — because both the login and password-reset flows deliberately
show a generic message regardless of whether the account was found
(so as not to leak which emails have accounts) — this failed
completely silently. No error, no failed-send log, nothing in Resend.
Found by checking a Vercel function log showing "External APIs: No
outgoing requests" for a `/forgot-password` request that should have
called Resend, cross-referenced against the actual stored email in
the database showing mixed case.

### The fix — three places needed it

1. **`lib/validation.ts`** — added one shared `emailField()` helper
   (`.trim().email().transform(v => v.toLowerCase())`) and replaced
   three separate, inconsistent inline email definitions
   (`loginSchema`, `inviteSchema`, `requestPasswordResetSchema`) with
   it, rather than patching each one slightly differently.
2. **`lib/actions/admin.ts`** — two more inline email schemas (Master
   Admin Console org provisioning, and its own team invite action)
   weren't using the shared validators at all and needed the same
   `.toLowerCase()` added directly.
3. **`lib/actions/signup.ts`** — the self-serve Stripe signup form's
   owner email, fixed at the point of collection so it flows through
   already-normalized into Stripe's metadata and the webhook that
   creates the organization from it.

`lib/actions/import-team.ts`'s bulk CSV import already lowercased
correctly — that one didn't need a fix, and is why bulk-invited
teammates were never affected by this.

### ⚠️ Required one-time step: backfill existing data

The fixes above only prevent *new* instances of this bug — they don't
retroactively fix accounts that already exist with mixed-case emails
(exactly the accounts hit by this in the first place). Run once, right
after deploying:

```bash
npx tsx scripts/lowercase-existing-emails.ts
```

Safe to run more than once. If lowercasing two existing rows would
collide (e.g. both `Test@x.com` and `test@x.com` already exist as
separate accounts somehow), that specific row is skipped and reported
rather than silently merged or crashing the whole run — that scenario
needs an actual human decision about which account to keep, not an
automated guess.

## Master Admin Console now auto-sends invitation emails

No schema change. Both provisioning paths now behave the same way —
important since Enterprise customers are specifically provisioned
through this console, not self-serve Stripe signup.

**Two actions fixed, same gap in both:**

- `createOrganizationAction` (creating a brand-new organization) — now
  sends the invitation email automatically, reusing the exact same
  `invitationEmail` template and pattern already working in the
  self-serve Stripe webhook.
- `inviteMemberToOrgAction` (adding an additional team member to an
  *existing* org from the admin console) — had the identical gap, since
  it's the same class of "creates an invitation, never emails it"
  issue. Fixed the same way.

**The "Copy invite link" button in both places is kept, not removed**
— now positioned as a backup/manual-share option rather than the only
way to get the link to the customer, with the on-screen copy updated
to say so explicitly rather than leaving it implying manual sharing is
still the only path.

**Both sends are best-effort**, matching the same reasoning already
used everywhere else email sending happens in this app — a Resend
hiccup shouldn't block the organization or invitation from being
created; the copyable link still works as a fallback either way.

## Support chat widget

No schema change. New dependency: `@anthropic-ai/sdk`.

**⚠️ Requires setup** — needs `ANTHROPIC_API_KEY` set (see
`.env.example`). Without it, the widget still appears and takes
questions — it just returns "Support chat is not configured yet."
instead of crashing, so a missing key never looks like a broken
feature to a real user.

### What this is, and deliberately isn't

This is the first of two tiers discussed — a support/FAQ assistant
that answers using only the Success Hub's existing content, with **no
access to the user's actual donors, grants, or any other real account
data**. The system prompt says this explicitly and instructs the model
to say so plainly rather than invent an answer if a question falls
outside the reference material. A data-aware version (answering using
someone's real donor data) is a meaningfully bigger, separate project —
real multi-tenant data-access security questions on top of everything
here, worth its own dedicated scoping conversation rather than
building it as an extension of this.

### How it works

- `lib/help/format-for-llm.ts` — flattens every Success Hub article
  into plain text, included directly in the system prompt. With ~20
  articles this comfortably fits in a single prompt — no vector
  database or retrieval step for this version. Revisit with real
  retrieval only if the help content grows enough to make this
  unwieldy, not before.
- `app/api/support-chat/route.ts` — the actual chat endpoint, streamed
  token-by-token back to the client. Requires a real session (same as
  every other route in the app) — this isn't reachable while logged
  out.
- `components/support-chat/SupportChatWidget.tsx` — the floating
  widget, mounted once in the `(app)` layout so it's available on
  every authenticated page. Not shown on the account-locked screen —
  that one stays intentionally minimal.

### A few things worth knowing about the implementation

- **Every field from the client is validated before any property
  access** — a malformed message (null, a stray string, a number in
  the array) is filtered out rather than crashing the route. Worth
  calling out specifically because an earlier draft of this exact
  filter had an operator-precedence bug (`&&` binding tighter than
  `||`) that would have let a `null` entry through to a property
  access that throws — caught and fixed before this shipped, not
  after.
- **Real caps on both message count and length** (20 messages, 2000
  characters each) — this is a real per-token API cost, not a free
  feature, and the caps exist specifically to bound a single runaway
  conversation's cost, not just for cleanliness.
- **The model is overridable via `SUPPORT_CHAT_MODEL`**, defaulting to
  `claude-sonnet-4-6` — worth revisiting if cost or quality
  considerations point toward a different one later.

## Fix: support chat now uses prompt caching (real cost reduction)

No schema change. **A real, meaningful fix, not a minor optimization**
— the original version resent and reprocessed the entire Success Hub
content (the whole system prompt) on every single message, even within
the same conversation. That's genuinely wasteful spend, not just
inefficient code.

### The actual fix

The system prompt is now marked with an ephemeral cache breakpoint:

```ts
system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }]
```

Since the Success Hub content is identical on every request — nothing
about it depends on what the user asks — only the *first* message in a
conversation pays full price to process it. Every message after that,
within a 5-minute window that refreshes on each use, reads it back at
roughly **10% of normal input cost** instead of reprocessing the same
block of text from scratch on every single turn.

### A real dependency-version bug this caught, worth knowing about

The originally-specified `@anthropic-ai/sdk` version (`^0.32.0`)
genuinely predates prompt caching as a stable, typed feature —
`cache_control` didn't exist on `TextBlockParam` in that version's
actual types at all. This surfaced as a real type-check failure, not
noise, and was fixed the same way the `@vercel/blob` version mismatch
was handled earlier in this build: checked the real installed types
first rather than assuming or casting past the error, then bumped to
`^0.60.0`, confirmed *that* version's real types actually support it,
and only then wired it in.

### Other things already in place that also bound cost

Worth remembering these are already there, not just this caching fix:
- **Message count and length caps** (20 messages, 2000 characters
  each) — bounds a single runaway conversation's total size
- **`max_tokens: 500`** — bounds the cost of any individual response
- **Requires a real session** — not reachable by anyone who isn't
  logged in, so there's no unauthenticated way to run up API spend
  against this endpoint at all

## Grant-specific roles

**⚠️ Schema change — requires a migration.** New `GrantRole` enum
(`GRANT_ADMINISTRATOR`, `GRANT_FINANCE_MANAGER`, `GRANT_WRITER`,
`GRANT_REVIEWER`) and a new optional `User.grantRole` field. Run:
```bash
npx prisma db push
```

### Additive, not a replacement — and a real bug caught before it shipped

These roles sit alongside the existing `Role` enum (Owner/Admin/
Fundraiser/Viewer), not in place of it. The critical design point,
worth understanding precisely: **while building this, the first
version of the permission check would have locked every existing
Fundraiser out of grants functionality they already had**, the moment
it deployed — including on United Way's live account — unless someone
went and separately assigned every single one of them a new grant
role. That's a severe regression, not an improvement, and it was
caught and fixed before any of this shipped: a Fundraiser's existing
baseline access (everything except deleting a grant entirely, which
was already Admin+ only) is explicitly preserved in
`hasGrantCapability()` — these roles only ever *add* capability, most
usefully to someone who wouldn't otherwise have grants access at all
(a Viewer who's also your dedicated Grants Finance person, for
instance).

### The capability matrix (`lib/grant-permissions.ts`)

| Role | Can do |
|---|---|
| Grant Administrator | Everything, including deleting a grant entirely |
| Grant Finance Manager | Budget, expenses, disbursements, documents, notes |
| Grant Writer | Applications, requirements, compliance, documents, notes |
| Grant Reviewer | Read-only, plus leaving notes |

Owner/Admin always have full access regardless, matching how the rest
of the app works. All ~23 grants action functions across
`lib/actions/{grants,grant-budget,grant-comments,grant-documents}.ts`
were migrated from the old blanket `assertRole(FUNDRAISER)` check to
`assertGrantCapability()` with the specific capability each action
actually needs — not one generic check reused everywhere.

**The grant detail page threads the correct specific capability to
each panel**, not one shared `canEdit` flag — a Grant Reviewer
genuinely can't edit the budget panel just because they can view it,
the way a single blanket flag would have allowed. Worth knowing this
took a couple of real fix-up passes to get every panel wired to its
actual correct capability rather than a plausible-looking wrong one —
mentioned here because it's the kind of mistake that compiles fine and
only shows up as a real person having access they shouldn't.

### Assigning grant roles

Settings → Team now has a "Grant role" column next to the base Role
column, editable the same way. Admin+ only, matching who can already
change someone's base role.

## Grant data import

No schema change. New route: `/grants/import`, plus a matching "Import
grants" link on the main Grants page.

Reuses the exact same generic import wizard shell already built for
gifts and team members
(`components/import/{UploadStep,MapStep,ReviewStep,DoneStep}.tsx`) —
new field definitions (`lib/import/grant-fields.ts`) and a new backend
action (`lib/actions/import-grants.ts`), not new UI infrastructure.

**Funders are matched by organization name to an existing Donor** —
this does not create donor records. A row whose funder doesn't match
an existing Organization/Foundation/Corporation donor is skipped with
a clear reason, same reasoning as gift import matching by donor email:
there's no reliable way to auto-create the *right kind* of donor
record from a name string alone.

**Grant writer defaults to whoever runs the import** if the file's
writer email doesn't match a real user — a reasonable starting
assignment for a bulk migration that's easy to bulk-reassign
afterward, rather than skipping otherwise-good rows over just this one
field.

**Only imports the pre-award pipeline.** Awarded/Declined rows still
come in (so historical data isn't lost), but converting one into a
tracked Grant with a compliance plan stays the existing deliberate,
separate step — award amount, grant period, and a compliance owner are
real decisions a source system's columns don't necessarily map to
cleanly, so this doesn't try to guess at them automatically.

## Support requests → support@donorsuccess.com

No schema change. New page: `/support`, linked from the main
navigation and from a small "Contact support" link inside the chat
widget's footer.

### How it works

A logged-in user fills in a subject and message; the email goes to
`support@donorsuccess.com` with **the customer's own email set as
`replyTo`** — added as a new capability on the shared `sendEmail()`
helper (`lib/email/resend.ts`), not something support requests had to
build for themselves. This means hitting "Reply" in the support inbox
goes straight back to the customer, not to the generic noreply sending
address — the actual point of using `replyTo` here rather than just
putting the customer's email in the body text somewhere.

This is a **contact form that emails support, not a full ticketing
system** — no database-backed ticket model, no status tracking, no
in-app history of past requests. That's a deliberate scope call: the
person's ask was specifically "get requests to support@donorsuccess.com,"
which this does directly. A real ticket-tracking system (statuses,
threaded replies visible in-app, assignment) would be a meaningfully
bigger, separate feature — worth its own conversation if actually
needed, not something to build speculatively on top of what was asked.

## Success Plans — Phase 1 & 2 (Gainsight-inspired enhancement, tabs + richer milestones)

**⚠️ Schema change — requires a migration.** New `PlanComment` model,
`MilestoneStatus` expanded from OPEN/DONE to
OPEN/IN_PROGRESS/DONE/BLOCKED, new `MilestoneCategory` enum, and
`PlanMilestone` gains `priority`, `category`, and an optional
`ownerId`. Run:
```bash
npx prisma db push
```

Built after reviewing Gainsight's actual Success Plans structure
(four tabs, CTAs with Owner/Priority/Reason, templates, an activity
timeline) and translating what genuinely fits a nonprofit fundraising
team — explicitly *not* copying Gantt charts or external plan-sharing,
which don't fit this context (see the conversation this was scoped in
for the full reasoning).

### Phase 1 — Tabs + activity feed

Reused two things already built for Grants rather than inventing new
patterns:
- `DetailTabs` — the plan detail page is now Overview / Milestones /
  Notes, same generic tab component from Grants
- `PlanComment`, mirroring `GrantComment` exactly — manual notes plus
  system-generated entries. `savePlanAction` now detects stage/status
  changes on update and logs them; `toggleMilestoneAction` logs one
  when a milestone is marked done.

### Phase 2 — Richer milestones

- **Status** expanded to four states (was a binary open/done toggle,
  now a dropdown) — `app/(app)/plans/page.tsx`'s "next due" filter was
  updated from `status === OPEN` to `status !== DONE`, since In
  Progress and Blocked milestones still have real due dates that
  matter for that view.
- **Priority** — reuses the existing `TaskPriority` enum and
  `PriorityBadge` component directly rather than inventing a
  parallel one.
- **Category** — a structured "why," adapted from Gainsight's CTA
  Reason field but with values specific to donor cultivation
  (Cultivation Call, Stewardship Touch, Ask Conversation, Thank You,
  Event Invitation, Follow-up, Other) rather than generic B2B
  categories.
- **Owner** — optional, per-milestone, falls back to the plan's own
  owner when unset.
- New `updateMilestoneAction` for editing these details after
  creation — kept separate from the status-toggle action, since a
  status change also drives `completedAt` and the system-comment log,
  which shouldn't fire just because someone re-prioritized or
  reassigned a milestone.

### Not yet built

**Phase 3 — plan templates and plan types** — the more novel piece,
intentionally not started yet. Scoped as the next step.

## Success Plans — Phase 3 (plan templates + plan types)

**⚠️ Schema change — requires a migration.** New `PlanType` enum,
`planType` field on `DonorSuccessPlan`, and two new models:
`PlanTemplate`, `PlanTemplateMilestone`. Run:
```bash
npx prisma db push
```

The more novel piece of the three phases, now complete. Mirrors the
existing `SequenceTemplate`/`SequenceTemplateStep` pattern closely
rather than inventing a new one — same "steps as local state, replace
all on save" form behavior, same list/new/edit page shape under
Settings.

### Plan Type

A new field, distinct from the existing Stage — Stage is *where* a
donor sits in the relationship (Attract → Legacy); Plan Type is the
plan's *purpose* (Major Gift Cultivation, Lapsed Donor Recovery,
Planned Giving, Stewardship, Onboarding, General). A donor in the same
stage can reasonably have either kind of plan, which is exactly the
limitation this fixes.

### Plan Templates

`Settings → Success Plan templates` — full CRUD, gated at Admin+ same
as Sequence templates. Each template holds an ordered list of
milestone blueprints (title, category, priority, and a day-offset
relative to whenever the template gets applied — not a fixed date,
since a template has no plan of its own yet).

**Applying a template to a real plan** (`applyPlanTemplateAction`)
converts each blueprint into an independent `PlanMilestone` row —
`dueDate` computed from the plan's own `startDate` plus the
blueprint's `dayOffset`. This is a one-time copy, not a live link:
editing the template afterward never retroactively changes milestones
already applied from it, the same guarantee Sequence templates already
give Success Sequence enrollments.

Reachable from a plan's Milestones tab via a new "Apply a template"
control, and gated behind the same edit permission as everything else
on that tab.

### Starter content

**Update: now covers all six Plan Types, not just two.** Originally
shipped with just Major Gift Cultivation and Lapsed Donor Recovery;
extended after a follow-up request to cover every plan type so nobody
picks a type and finds no matching template available:

- **Major Gift Cultivation** (5 milestones) — cultivation through to the ask
- **Lapsed Donor Recovery** (3 milestones) — a lighter-touch reconnection path
- **Planned Giving Conversation** (5 milestones) — a slower, trust-focused legacy-giving path
- **Ongoing Stewardship** (4 milestones) — a no-ask relationship-maintenance rhythm
- **New Donor Onboarding** (4 milestones) — a first-90-days welcome path
- **General Donor Engagement** (3 milestones) — a simple starting point for anything else

All wired into the same idempotent `createStarterContent()` helper and
the existing "Load starter content" button in Settings — not a
separate mechanism, and safe to click again for an existing
organization to pick up the four newly added ones without duplicating
the original two.

## Executive Dashboard enhancements

**⚠️ Schema change — requires a migration.** New model:
`ExecutiveBriefingSnapshot` (one row per organization). Run:
```bash
npx prisma db push
```

**⚠️ Also a new (fifth) cron job** —
`/api/cron/generate-executive-briefing`, scheduled at 7:30am, after
score recalculation so it reflects the freshest risk data. Worth
actually checking your Vercel plan's cron limit this time — this is
genuinely the fifth one added over the course of this build.

Prompted by reviewing a broader product design document (Donor 360,
Board Engagement, Journey Builder, Executive Dashboard, Giving
Analytics) — most of that document's scope was either already covered
by existing features or oversized for this product's actual team size
and users. This is the contained, genuinely additive slice: two new
pieces on the dashboard, both **only shown in "Whole Organization"
view**, not personal "mine" view, since an "Executive Briefing" doesn't
make sense on a fundraiser's personal dashboard.

### Why the briefing is generated once a day, not on every page view

Calling Claude synchronously on every dashboard load would add real,
avoidable latency to the single most-viewed page in the app, and real,
avoidable API spend for a page that gets opened constantly. Instead:
a daily cron generates one narrative per organization and stores it;
the dashboard just displays the cached result with a visible "Generated
[time]" timestamp, so it's never presented as more current than it
actually is.

**Every number fed to the model is exactly what the dashboard's own
"Whole Organization" view already computes** — donor count, YTD giving
vs. the same stretch last year, open pipeline, retention rate, risk
band counts, overdue tasks, at-risk donors with no active Success
Plan, and near-term grant deadlines. Nothing computed specially for
the AI, and the prompt explicitly forbids inventing a specific donor
name or figure not given to it — grounding, not embellishment.

### Decision Queue

Aggregates four signals that already exist as separate concepts into
one prioritized list:
- Overdue high-priority tasks (org-wide)
- At-risk donors with no active Success Plan — a genuinely new signal,
  not computed anywhere else in the app today, and arguably the most
  useful "who needs attention" item this feature adds
- Grant deadlines within 7 days or overdue
- Campaigns whose raised-vs-goal pace is meaningfully behind what
  elapsed time alone would predict (a 15-point gap threshold, so a
  campaign that's naturally slow to start doesn't get flagged
  immediately)

## Fix: crons now retry on Neon cold-start failures

No schema change. New helper: `lib/db-retry.ts`, applied to the
initial database query in all five cron jobs.

### The actual problem

Neon auto-suspends its compute after inactivity, and the first
connection after that can fail once while it wakes up — the same
`P1001: Can't reach database server` error already seen with `db
push`. That's a minor annoyance when it's a command *you* just ran and
can retry. It's a real reliability gap when it's a **scheduled cron
firing at 6 or 7am with nobody watching** — it would just silently not
run that day, with no visible failure until someone notices a missing
briefing or a skipped sync.

### The fix

`withDbConnectionRetry()` wraps a cron's initial query and retries up
to twice more, with a short backoff, **but only for connection-level
failures** (`P1001`, or a Prisma client initialization error) — not a
general catch-all. This distinction matters: a genuine application bug
(a bad query, a constraint violation) should surface immediately, not
get silently retried and masked behind a few seconds of delay. A
connection failure specifically means no query has reached the
database server yet, which is what makes blindly retrying the whole
cron body safe here — nothing partial could have already happened.

Applied to all five crons for consistency: deleting canceled orgs,
recalculating scores, the Salesforce sync, grant deadline reminders,
and the new executive briefing generator.

## Board Engagement — member dashboard page

**⚠️ Schema change — requires a migration.** Replaced `BoardTerm`'s
single `committeeId` FK with a proper many-to-many
(`CommitteeMembership`) — board members commonly serve on more than
one committee at once, which the original single-FK design didn't
allow. Also added `BoardMeeting` and `BoardMeetingAttendance`. Run:
```bash
npx prisma db push
```

New page: `/board/members/[termId]` — a single board member's own
view: tenure served and time remaining, which committees they're on,
commitments and fulfillment status, meeting attendance with a
computed attendance rate, and introductions they've made. Explicitly
framed around "what has this person's involvement actually meant" —
lifetime giving sits in the same stat row as tenure and attendance,
not off in a separate report, since the whole point is making the
value of their investment visible at a glance.

Logging a meeting (`addBoardMeetingAction`, built in the actions
layer) defaults every relevant board or committee member to
"Attended" rather than requiring attendance marked one person at a
time — real, avoidable friction otherwise for a board that's usually
"everyone but one or two people showed up."

### ⚠️ Real gap: this page isn't reachable yet

**There's currently no `/board` roster page, and nothing links to a
specific board member's dashboard.** The page itself works if you
navigate to it directly by URL once you have a real `BoardTerm` id,
but there's no UI yet to create a Board, add a member, or find your
way to this page from anywhere else in the app. Deliberately not
added to the main navigation this round — a nav link pointing at a
roster page that doesn't exist yet would just be a dead link.

**Next, and necessary before this is actually usable**: the `/board`
aggregate roster page — list boards, add board members, create
committees and meetings — which is what will actually link into every
member's dashboard page built here.

## Board Engagement — roster page (now actually reachable)

No schema change this round. New page: `/board`, now in the main
navigation — this is what makes every board member's dashboard page
(built in the previous round) actually reachable, which it wasn't
before this.

### What it does

- **No board yet** → a simple setup form (name + start date)
- **Board exists** → a roster table (member, role, committees,
  commitment fulfillment, meeting attendance), each name linking to
  that member's own dashboard page
- **Add board member** — search/select an existing donor (already
  filtered to exclude anyone already an active member), assign role,
  committees (checkboxes — a member can be on more than one), and term
  dates
- **Add committee** — simple inline form
- **Log a meeting** — title, date, optional committee scope, notes;
  defaults everyone relevant to "Attended" (see the reasoning in the
  Phase 2 write-up — correcting exceptions afterward is far less
  friction than marking attendance one person at a time for every
  meeting)

### Still not built

Editing/removing a board member (ending their term), archiving a
board, and multi-board history (the page currently shows only the
single most recent active board) are all reasonable next additions,
not built this round — this was scoped specifically to making the
existing member dashboards reachable and usable day to day, not a
full board-administration suite.

## Board meeting documents + meeting-level attendance

**⚠️ Schema change — requires a migration.** New model:
`BoardMeetingDocument`. Run:
```bash
npx prisma db push
```

New page: `/board/meetings/[meetingId]` — a dedicated detail page for
one specific meeting, linked from the "Recent Meetings" list on the
main `/board` roster page (previously just plain text, not clickable).

### Meeting documents (agendas, minutes)

`BoardMeetingDocument` mirrors `GrantDocument` exactly — same private
Vercel Blob storage, same authenticated proxy download route
(`/api/board/documents/[id]/download`), same reasoning: the raw blob
URL is never exposed to the client, only the proxy route that
re-verifies session and organization on every request. 4MB per file,
same limit as grants, for the same reason (Vercel's serverless
function body size cap on server-side uploads).

### Meeting-level attendance — the actual ask

Previously, attendance was only checkable one board member at a time,
on their own dashboard page. This page flips that: pick a meeting, see
everyone who was supposed to be there, correct anyone's status in one
place — the actual "systems admin checks attendance at the meeting
level" view, not scattered across each member's individual page.
`updateMeetingAttendanceAction` now also revalidates this page (using
the `meetingId` off the updated record itself, not an extra form
field) so a correction shows up immediately regardless of which page
it was made from.

## Giving Analytics enhancements

No schema change. Three pieces, in the order they were built:

### 1. Fixed missing drill-through links (Retention, Pipeline)

Checked every existing report against reality rather than memory —
**Retention and Pipeline both showed individual donor/opportunity
names as plain text**, not links, despite At-Risk already doing this
correctly. Now all three are consistent: donor names link to
`/donors/[id]`, opportunities link to `/pipeline/[id]`.

### 2. New drill-through for the two purely-aggregate reports

Giving Summary and Segmentation only ever showed totals — there was
nothing to click into, since no individual records were displayed at
all. Now:
- Giving Summary's monthly bar chart links to
  `/reports/giving-summary/[monthKey]`, showing the actual gifts
  behind that month's total
- Segmentation's segment and donor-type rows both link to
  `/reports/segmentation/donors?field=...&value=...`, showing the
  actual donors in that group — one shared page for both tables rather
  than two nearly-identical ones

### 3. New: Cohort Analysis (`/reports/cohorts`)

The genuinely new lens requested — donors grouped by the calendar year
of their **first** gift, tracking what share of that cohort is still
giving in every year since, as the classic cohort retention heatmap
(darker cell = stronger retention). This is a different question than
the existing Retention report answers: Retention is a rolling
12–24 month snapshot; Cohort Analysis asks "of everyone who joined in
2022, how many are still with us in 2026?" — visible across every
cohort at once, not just the most recent one.

A cell that a cohort hasn't reached yet (e.g., "Year 5" for a cohort
that only joined 2 years ago) is shown as an empty dash rather than a
misleading 0% — the distinction between "not retained" and "hasn't
had the chance to be retained yet" matters here.

## Salesforce sync — giving-history filter

**⚠️ Schema change — requires a migration.** New field:
`CrmConnection.minGivingHistoryYears` (nullable, opt-in). Run:
```bash
npx prisma db push
```

### Worth knowing before anything else here: corporations, major gifts, and account history were already syncing

Checked the actual sync code rather than assume anything was broken.
Salesforce Accounts already sync in as ORGANIZATION-type donors
(correctly filtering out NPSP's auto-generated "Household Account"
noise, so real corporations come through clean), and any Closed Won
Opportunity already creates a Gift record — that's major gifts and
account history, already working before this round.

### What's actually new: the 5-year (or any N-year) filter

Settings → Salesforce now has a toggle: "Only sync contacts and
accounts with a won gift in the last N years." Off by default for
every connection, including existing ones — turning it on is an
explicit choice, not a silent change to what an already-connected
org's sync pulls in.

The filter runs as a **SOQL semi-join inside the Salesforce query
itself** (`Id IN (SELECT ContactId FROM OpportunityContactRole WHERE
Opportunity.IsWon = true AND Opportunity.CloseDate > ...)` for
Contacts, similarly via `Opportunity.AccountId` for Accounts) — a
non-qualifying record is never even transferred out of Salesforce, not
merely filtered out afterward.

**Only affects future syncs.** Turning this on never retroactively
deletes a donor record that was already synced in before the filter
existed — it only changes what gets pulled in going forward.

## Convert Opportunity to Grant

No schema change — both `Opportunity` and `GrantOpportunity` already
existed; this is purely a new conversion action + UI.

New button on any opportunity's detail page: **Convert to Grant**.
Handles exactly the case that prompted it — a Salesforce-imported
Opportunity that's actually a grant, sitting in the wrong section of
the app.

### What actually happens on conversion

- Validates the opportunity's donor is an Organization, Foundation, or
  Corporation — grants can only be attributed to organization-type
  funders, the same rule already enforced everywhere else in the
  grants module. An individual donor's opportunity can't be converted
  until the donor's type is corrected first.
- Maps the Opportunity's stage to a reasonable starting `GrantStage`
  (best-effort — there's no clean 1:1 correspondence between the two
  stage sets), shown as a **pre-filled but editable** dropdown, not
  applied silently.
- Any open tasks linked to the Opportunity are re-pointed to the new
  Grant rather than left orphaned.
- **The original Opportunity is deleted, not archived** — keeping both
  around would double-count the same real-world grant in Pipeline
  reports and Grants reports simultaneously, a real data-integrity
  problem, not a cosmetic one.

### A real bug caught before it ever reached deployment

The stage-mapping helper (`defaultGrantStage`) was originally written
inside the `'use server'` action file itself. Next.js has a real,
documented constraint that every export from a `'use server'` file
must be an async function — a synchronous helper like this one would
have thrown `"A 'use server' file can only export async functions"`
at build time, the exact same class of failure as the earlier Prisma
schema issue: something my own TypeScript-based checks can't catch,
since it's a Next.js-specific compiler rule, not a general type error.
Caught this by recognizing the risk and verifying it directly rather
than assuming — moved the function to `lib/grants.ts`, a plain module,
and confirmed via a systematic sweep that no other `'use server'` file
in the project has the same mistake.

## CRM resync, purge & rebuild, and admin console controls

No schema change — everything here builds on the existing
`CrmConnection` model. New shared module: `lib/sync/crm-reset.ts`,
used identically by both the client's own Settings page and the
platform admin console, so the two surfaces can never drift apart in
behavior.

### Two genuinely different operations, both now available

**Resync** (safe refresh) — resets the sync bookmark; the next sync
re-pulls everything from Salesforce into records already here, matched
by Salesforce ID. Nothing is deleted.

**Purge & Rebuild** — actually deletes every donor, opportunity, and
gift this connection ever created, then rebuilds from scratch on the
next sync. Genuinely destructive: deleting a Salesforce-sourced donor
cascades to delete everything attached to them in Donor Success —
tasks, Success Plans, Grants, notes — not just the Salesforce-sourced
parts. Requires typing the organization's name back exactly before
it'll run, the same confirmation weight as other irreversible actions
in this app. There was no existing "type to confirm" pattern anywhere
in the codebase to reuse here — this is a new one, built specifically
because nothing this destructive existed before.

### Platform admin console (`/admin/organizations/[id]`)

A new CRM Connection section gives Jarvis's team the same four
capabilities for any client, without the client needing to log in:
Resync, Purge & Rebuild (same typed-confirmation requirement),
Disconnect, and setting the giving-history filter. All four reuse the
exact same underlying functions as the client-facing versions —
gated by `requirePlatformAdmin()` and taking an explicit
`organizationId` instead of inferring it from the session, matching
every other admin-console action in this file.

### A real bug caught before deployment, not after

Initially wrote `\u2014` as literal text inside JSX in one spot in the
admin CRM component — that syntax only resolves to an em dash inside
an actual JS string or template literal; as raw JSX text it would have
rendered the literal characters `\u2014` on screen. Caught and fixed
before this ever shipped. Also re-ran the full sweep for the
`'use server'` async-export mistake from the last round on every
action file touched here — clean.

## Configurable per-role navigation visibility

**⚠️ Schema change — requires a migration.** New model:
`HiddenNavItem`. Run:
```bash
npx prisma db push
```

New page: **Settings → Navigation**. A matrix — every nav item as a
row, Admin/Fundraiser/Viewer/Board Member as columns, checkboxes
controlling what each role sees in the main navigation. Nothing is
hidden for anyone until an Admin explicitly configures it — every
existing organization keeps seeing the full nav exactly as before.

### Owner is deliberately not configurable here

Owner always sees every nav item, full stop, enforced in code (the
layout skips the lookup entirely for Owner) as well as by simply never
offering it as a column in the matrix. Without this floor, hiding
Settings from every other role and then also hiding it from Owner
would make the misconfiguration permanent — nobody could ever reach
the page that undoes it.

### This hides the link, not the access

Worth being precise about what this actually does: it controls what
shows up in navigation, not what a role can do if they reach a page
directly by URL. Pair this with the right base role (or Grant/Board
role, where relevant) for anything that genuinely shouldn't be
touched — this is a visibility control, not a permissions system.

### Two places needed the same fix

Both `SidebarNav` (desktop) and `MobileNavDrawer` (mobile) read from
the same shared `navItems` list independently — missing either one
would mean a role sees a link on desktop but not mobile, or vice
versa. Both now take the same `hiddenHrefs` prop, computed once in the
layout and passed to both.

## Donor 360 — relationship graph

No schema change — this surfaces data that already existed across
Board Engagement and staff assignment, but had never been unified on
the donor's own page.

New panel on the donor detail page's Relationships tab, showing —
each labeled with its actual source, not a guessed confidence score:
- **Assigned staff member**
- **Board membership** — role and which board, linking to that
  member's own dashboard page (a real gap this closes: a donor who's
  also a board member previously had zero indication of that on their
  own donor record — the only place it showed up at all was the
  separate `/board` roster)
- **Introduced by a board member** (when this donor was the prospect)
- **Introductions this donor has made** (when this donor is
  themselves a board member)

## What's next

- **Email delivery** for invitations — currently a copyable link;
  `lib/actions/settings.ts` has a comment marking where to add
  Resend/SendGrid/etc. (on hold — see note below)
- **Plan history view** — the schema supports multiple plans per donor
  over time, but there's no UI yet to browse a donor's past
  (`COMPLETED`/`ARCHIVED`) plans, only the current active one
- **Native CRM connections** (Salesforce, HubSpot, StratusLive,
  Blackbaud, Andar) — CSV import (donors + gift history) is done; live
  OAuth-based sync to a specific platform is the next major slice
- Email invitations are intentionally paused: the plan is for new users
  to be provisioned only after a paid subscription and initial data
  load, which changes how `/register` and the invite flow should work
  (self-serve signup likely needs to be locked down or replaced
  entirely). Worth designing deliberately before building further, not
  bolting onto the current self-serve flow.

