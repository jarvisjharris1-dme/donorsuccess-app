# Jarvis V1 — Resource Development Officer

The Jarvis navigation item at /insights is now the officer workspace. /jarvis redirects there. The existing AI chat remains available at /insights?view=chat.

## United Way activation

1. Sign in to app.donorsuccess.com with the existing United Way organization account. Confirm the organization name in Jarvis. Do not import United Way records into a different organization.
2. An organization administrator checks the existing Salesforce connection and its last successful synchronization in Settings, or imports approved donor data through the existing importer.
3. Confirm donor ownership and recorded risk; add campaign dates, goals, and fundraising tasks using existing forms. Jarvis uses these records immediately.
4. Start with a small assigned portfolio. Open a donor, review the source facts, then prepare an outreach draft. Edit and approve in the personal approval queue. Approval never sends email.
5. Copy approved text into the normal email workflow and verify the recipient. Log the actual touchpoint through the existing donor page after sending.
6. Review overdue tasks, drafts, and missing ownership with the pilot supervisor each week.

## Data and authority

All reads and writes derive organizationId from the authenticated session. No cross-organization selector or synthetic donors are added. Viewer and Board Member roles cannot access the workspace/actions. Draft editing is restricted to the assigned user. Completing normal tasks requires the assigned user or organization administrator. Campaign visibility matches the existing fundraiser assignment rules. Scope is a view filter consistent with the current app, not a new authorization boundary.

Drafts use the existing Task model with a versioned, validated description envelope. This avoids a schema migration in V1. Drafts may also appear in the normal task list; use Jarvis Approvals to approve or reject them. Changing a generic task's status does not constitute approval: approval is recorded in the draft envelope and audit log. Draft updates and decisions use optimistic concurrency and an atomic audit write. No gift, pledge, donor financial field, or email send path is mutated by this release.

The review queue includes the latest 50 personal drafts; the UI labels this limit. Displayed relationships are the top 12 in scope by lifetime giving, tasks are capped at 30 with total counts, campaigns at 8, and risk suggestions at 8. Full records remain accessible through existing pages.

Queue and outreach drafting use rules and templates. Existing AI chat uses its existing provider/configuration. No new model, key, cost commitment, scheduled automation, or unattended sending is introduced.

## Verification

Use the Vercel build for TypeScript and production compilation. Then check:
- Unauthenticated requests redirect to login; Viewer and Board Member access redirects to dashboard.
- A fundraiser sees assigned donors by default, organization-wide view remains consistent with the existing app.
- Restricted campaigns remain hidden from unassigned fundraisers.
- Draft creation persists in the correct organization and survives refresh; a second click reuses an outstanding draft.
- Cross-tenant donor IDs and other users' draft IDs are rejected server-side.
- Save, approve, reject, and stale-edit rejection work; placeholders block approval.
- Approval records actor/time/audit history and does not send email.
- Normal task completion persists and cannot be used to approve a draft.
- Existing AI chat, donors, campaigns, tasks, and Settings routes still work.

For production beyond the pilot: dedicated draft/approval tables with delivery state, evidence links and contact identity verification, monitored scheduled reviews, retry/idempotency controls, and organization-specific communication policies.
