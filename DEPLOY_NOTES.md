# Deployment notes — Display name + Allocations (Phase 3C)

## Deploy order

1. Add the **new** files first (GitHub's "Create new file" — the browser
   uploader drops nested paths, so these can't go through it).
2. Paste over the **modified** files (existing files, safe to edit
   in-place via GitHub's file editor).
3. Deploy on Vercel as usual.
4. Run `prisma db push` against the live Neon database — required this
   time, since `schema.prisma` changed (six new models).
5. Assign at least one teammate the `GRANT_ADMINISTRATOR` grant role
   (Settings → Team) — the three new sub-granting capabilities
   (`MANAGE_FUNDING_ROUNDS`, `MANAGE_APPLICATIONS`, `SCORE_APPLICATIONS`)
   are deliberately NOT auto-granted to base Fundraisers, so without
   this nobody will see the "New funding round" / "Start application"
   buttons.

## New files (use "Create new file", paste full path + contents)

```
components/settings/ProfileForm.tsx
lib/actions/funding-rounds.ts
lib/actions/grantees.ts
lib/actions/grantee-applications.ts
lib/actions/evaluations.ts
lib/actions/allocations.ts
lib/allocations.ts
components/allocations/FundingRoundForm.tsx
components/allocations/GranteeForm.tsx
components/allocations/StartApplicationForm.tsx
components/allocations/RoundStatusControl.tsx
components/allocations/ComplianceForm.tsx
components/allocations/CategoryRequestForm.tsx
components/allocations/CategoryRequestsSection.tsx
components/allocations/EvaluationForm.tsx
components/allocations/AllocationForm.tsx
components/allocations/SubmitApplicationButton.tsx
app/(app)/funding-rounds/page.tsx
app/(app)/funding-rounds/new/page.tsx
app/(app)/funding-rounds/[id]/page.tsx
app/(app)/grantees/page.tsx
app/(app)/grantees/new/page.tsx
app/(app)/grantees/[id]/page.tsx
app/(app)/grantee-applications/[id]/page.tsx
```

## Modified files (edit in place)

```
prisma/schema.prisma       — 6 new models + back-relations, appended after GrantExpense
lib/tenant-db.ts           — new models added to the tenant-scoped set
lib/grant-permissions.ts   — 3 new capabilities
lib/validation.ts          — new Zod schemas appended at the end
lib/nav.ts                 — "Allocations" nav item added
lib/actions/settings.ts    — updateOwnProfileAction added
app/(app)/settings/page.tsx — "Your profile" section added
app/(app)/layout.tsx       — display name now read live from DB, not the JWT
app/(app)/dashboard/page.tsx — greeting now reads live from DB, not the JWT
```

## What's intentionally not built yet

- Edit pages for an existing `FundingRound` or `Grantee` (create + list +
  detail are there; editing after creation isn't wired up yet)
- A "my applications to score" filtered view for reviewers — right now
  a reviewer finds applications via the round's application list
- CSV import for grantees/applications (mirroring `/grants/import`)
- Public-facing application portal for applicants to self-submit

None of these block a working end-to-end flow (create a round → add
grantees → start + submit applications → score → decide allocations),
but flag any of them if you want them next.
