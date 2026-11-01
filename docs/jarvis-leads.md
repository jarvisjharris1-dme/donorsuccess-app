# Jarvis working leads, pipeline, and proposed communications

Open Jarvis → Leads & outreach, or /jarvis/leads.

Build my pipeline reviews up to 50 CRM donor records by cached lifetime giving in the selected portfolio scope. It creates a personal working list with source references, rule-based qualification evidence, and purpose-specific proposed communications. Existing personal leads for the same CRM donor are preserved, including closed leads. Repeated builds consider the same top 50 records; use manual lead entry for further prospects. This release does not perform web prospect discovery or background monitoring.

The pipeline is durable, organization-scoped, and owned by the user who builds or enters it. Any fundraiser can view organization leads, consistent with the existing app's organization view. Only the lead owner or an organization administrator can change a record. Build operations are serializable and atomic to prevent overlapping builds from duplicating entries. No donor records, gifts, financial commitments, or email sends are created by pipeline building.

Each lead has a name, target contact/email, source, reason for fit, outreach purpose, stage, priority, follow-up date, next step, and proposed subject/body. Stages: Identified, Researching, Ready for outreach, Contacted, Meeting scheduled, Qualified, Nurture, Closed. Staff update stages; these do not claim that an email was sent. Sorting and stage counts apply to the current page of 25 recent records; name search and pagination cover the saved list.

Quality is a transparent qualification rubric: mission fit 30; relationship 20; giving evidence 20; contact readiness 15; timing 15. Unknown evidence earns no points. Missing mission fit, contact data, or supporting evidence yields Needs qualification regardless of numeric score. Qualified grades: High >=80, Developing >=55, Nurture <55. Scores are not conversion probabilities or wealth estimates. Past recorded giving does not establish present giving capacity.

CRM generation infers only possible affinity from recorded giving, relationship evidence from recorded interaction count, and a potential renewal window from last gift 330–420 days ago. Other timing remains unknown. Every generated message contains a required verified-personalization placeholder. Review and replace it before approval. New or edited recipient, message, rationale, or provenance clears prior approval. Approval also requires a named contact and valid email. It records actor/time with an audit event, but never sends. Copy the approved message into the normal email workflow and verify the recipient there.

V1 uses validated versioned Task descriptions, avoiding a database migration. Ordinary Jarvis commitment counts exclude lead records. The full Tasks view may still show them; edit leads through Jarvis so structured fields and approval history remain intact. A later release should use dedicated lead and communication tables, stronger source verification, CRM prospect discovery beyond the top-50 batch, and delivery-state tracking.

Verification: six unit tests cover payload validation, missing-evidence grading, rubric totals, approval invalidation, date/email validation, and goal-specific proposals. Build and TypeScript checks run through Vercel. Authenticated tenant and persistence flows still require the signed-in pilot session.
