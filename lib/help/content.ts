export type HelpBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'steps'; items: string[] }
  | { type: 'callout'; text: string; tone?: 'info' | 'warning' };

export type HelpArticle = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  blocks: HelpBlock[];
};

export const HELP_CATEGORIES = [
  'Getting Started',
  'Donors',
  'Pipeline & Success Plans',
  'Grants',
  'Campaigns',
  'Email & Communication',
  'Reports',
  'Salesforce Integration',
  'Team & Settings',
] as const;

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Getting Started ────────────────────────────────────────────────
  {
    slug: 'welcome',
    title: 'Welcome to Donor Success',
    category: 'Getting Started',
    summary: 'A quick tour of what Donor Success does and how the pieces fit together.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Donor Success is a donor relationship platform built around one idea: you should always know which donors need attention, and why. Everything in the product feeds into that — health scores, retention risk, next best actions, and your dashboard all point at the same question: who should I talk to today?',
      },
      { type: 'heading', text: 'The main areas' },
      {
        type: 'list',
        items: [
          'Dashboard — your daily starting point: retention rate, pipeline value, and donors that need attention',
          'Donors — every donor record, with health scores, giving history, contacts, and affiliations',
          'Pipeline — open major-gift opportunities and their stage',
          'Success Plans — structured, milestone-based plans for cultivating a specific donor',
          'Campaigns — appeals and initiatives, with sub-campaigns and visibility controls',
          'Reports — five standard reports covering retention, giving, segmentation, pipeline, and at-risk donors',
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'New here? Start with the Getting Started checklist — it walks through the setup steps in the order that actually matters.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Prefer asking instead of reading? The chat icon in the bottom-right corner of any page answers questions directly, using this same Success Hub content.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Need an actual person? Support in the main navigation sends your message straight to our support team — you\u2019ll hear back at your account email.',
      },
    ],
  },
  {
    slug: 'connect-your-email',
    title: 'Connect your email (Gmail or Outlook)',
    category: 'Getting Started',
    summary: 'Send donor emails from your own inbox, tracked automatically on the donor record.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Donor Success can send emails to donors directly from a donor\u2019s page — but it sends them from your own Gmail or Outlook account, not a shared company address. That way replies land with you, and it doesn\u2019t look like bulk mail from a stranger.',
      },
      {
        type: 'steps',
        items: [
          'Go to Settings',
          'Find the Email integration section',
          'Click Connect Gmail or Connect Outlook',
          'Sign in and approve access when your email provider asks',
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'This is personal — every fundraiser connects their own account. It\u2019s separate from any Salesforce connection your organization has, which is shared across the whole team.',
      },
      {
        type: 'paragraph',
        text: 'Once connected, you\u2019ll see a Send Email button on any donor with an email address on file. Sending an email also logs it automatically as an interaction on that donor\u2019s record.',
      },
    ],
  },
  {
    slug: 'dashboard-overview',
    title: 'Understanding your Dashboard',
    category: 'Getting Started',
    summary: 'What each section of the Dashboard shows, and how the My View toggle changes it.',
    blocks: [
      {
        type: 'paragraph',
        text: 'The Dashboard is built to answer one question fast: what needs my attention today? Every section on it exists to answer some version of that.',
      },
      { type: 'heading', text: 'My View vs. Whole Organization' },
      {
        type: 'paragraph',
        text: 'Near the top of the Dashboard (and on Donors, Pipeline, and Success Plans too) is a toggle between My View and Whole Organization. My View scopes everything to donors and pipeline assigned specifically to you. Whole Organization shows everyone\u2019s. Fundraisers default to My View; Owners, Admins, and Viewers default to Whole Organization, since they don\u2019t usually have donors personally assigned to them.',
      },
      { type: 'heading', text: 'What\u2019s on it' },
      {
        type: 'list',
        items: [
          'Retention rate — the percentage of donors who gave again this year out of everyone who gave 12\u201324 months ago',
          'Stat cards — donor count, lifetime raised, open pipeline value, active campaigns',
          'Needs your attention — your own assigned donors at high or critical retention risk, always personal regardless of the toggle',
          'Sequence steps due — every due Success Sequence step across your assigned donors, in one queue',
          'Upcoming tasks and Recent gifts — a quick-glance worklist',
        ],
      },
    ],
  },

  // ── Donors ───────────────────────────────────────────────────────────
  {
    slug: 'adding-editing-donors',
    title: 'Adding and editing donors',
    category: 'Donors',
    summary: 'Individual vs. organization donors, and what each field is for.',
    blocks: [
      {
        type: 'paragraph',
        text: 'A donor can be an Individual, Household, Organization, Foundation, or Corporation. The donor type changes what the form asks for — individuals get First/Last name fields, while Organization/Foundation/Corporation donors get an Organization Name field instead.',
      },
      {
        type: 'steps',
        items: [
          'Go to Donors → Add Donor',
          'Choose the donor type at the top — this determines the rest of the form',
          'Fill in contact info, segment, and (if applicable) who on your team is assigned to them',
          'Save',
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Assigning a donor to a specific fundraiser is what makes them show up in that person\u2019s My View — worth doing deliberately, not left blank.',
      },
    ],
  },
  {
    slug: 'donor-health-scores',
    title: 'Donor health scores & retention risk',
    category: 'Donors',
    summary: 'How the score is calculated and what the risk tiers mean.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Every donor has a health score and a retention risk tier (Low, Medium, High, Critical). These recalculate automatically whenever a gift or interaction is logged for that donor, and nightly for every donor org-wide, so scores stay current even for donors you haven\u2019t touched recently.',
      },
      {
        type: 'paragraph',
        text: 'The score factors in recency and consistency of giving, and recency of engagement (interactions, emails). A donor who gave generously two years ago but hasn\u2019t been contacted since will show as at-risk — that\u2019s the point: it surfaces exactly the donors who look fine at a glance but are quietly drifting away.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'You can trigger a manual recalculation for every donor at once from Settings → Data & scoring, if you don\u2019t want to wait for the nightly run — useful right after a bulk import.',
      },
    ],
  },
  {
    slug: 'donor-contacts-and-affiliations',
    title: 'Donor Contacts and Affiliations',
    category: 'Donors',
    summary: 'Tracking the people at an organization donor, and connections between donors.',
    blocks: [
      { type: 'heading', text: 'Contacts' },
      {
        type: 'paragraph',
        text: 'When a donor is an Organization, Foundation, or Corporation, its page shows a Contacts section — the actual people there (their CEO, their philanthropy director, whoever champions you internally). Each contact can be tagged as Executive, Influencer, Donor, or Advocate, and one can be marked Primary.',
      },
      {
        type: 'paragraph',
        text: 'Each contact can also be tagged with an Engagement Style — Driver, Dreamer, or Doer — which is a separate thing from Contact Type. Contact Type is about their role (are they an executive, an influencer); Engagement Style is about how they\u2019re actually best cultivated. A Driver wants to see results and make the decision, so lead with data and a clear ask. A Dreamer responds to vision and the mission\u2019s big picture, so lead with story and impact. A Doer wants to be hands-on and involved, so lead with a specific way to participate, not just a gift ask. The same person can be both \u2014 for example an Executive who\u2019s also a Driver — these describe two different things about the same contact, not alternatives to each other.',
      },
      { type: 'heading', text: 'Affiliations' },
      {
        type: 'paragraph',
        text: 'Affiliations work in the other direction — they tag a donor\u2019s connection to an organization, on any donor regardless of type. Use this for an individual\u2019s employer, board membership, or family foundation. If the affiliated organization happens to already be a donor in your system, you can link the two records directly for quick navigation between them; otherwise it\u2019s just a free-text note.',
      },
    ],
  },
  {
    slug: 'importing-donors-csv',
    title: 'Importing donors from a CSV',
    category: 'Donors',
    summary: 'Bulk-add donors and gift history from a spreadsheet export.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Go to Donors → Import CSV',
          'Choose Donors or Gift History',
          'Upload your file — the system will suggest a column mapping automatically',
          'Review the mapping and fix anything that wasn\u2019t guessed correctly',
          'Review the preview, then confirm the import',
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Donor import matches by email to avoid creating duplicates. Gift import matches gifts to existing donors — import your donors first, then their gift history.',
      },
      {
        type: 'paragraph',
        text: 'Imports are capped at 5,000 rows per file to keep things reliable — split a larger export into a few files if needed.',
      },
    ],
  },
  {
    slug: 'wealth-screening',
    title: 'Wealth screening (WealthEngine)',
    category: 'Donors',
    summary: 'Pull estimated net worth, giving capacity, and Propensity to Give for a donor.',
    blocks: [
      {
        type: 'paragraph',
        text: 'If your organization has connected WealthEngine (Settings → WealthEngine, Admin access required to connect), you\u2019ll see a Wealth Insights panel on donor pages showing estimated net worth, income, real estate value, giving capacity, and a Propensity to Give score.',
      },
      {
        type: 'callout',
        tone: 'warning',
        text: 'Screening a donor has a real per-profile cost, so it\u2019s always a deliberate click on that specific donor — never automatic and never in bulk.',
      },
      {
        type: 'paragraph',
        text: 'WealthEngine needs a name plus at least one of: a full mailing address, an email, or a phone number to find a match — screening will fail with a clear message if a donor doesn\u2019t have enough information on file yet.',
      },
    ],
  },
  {
    slug: 'volunteer-hours',
    title: 'Tracking volunteer hours',
    category: 'Donors',
    summary: 'Log contributed time and its estimated dollar value — kept separate from giving totals.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Any donor page has a Volunteer Hours panel where you can log hours someone contributed \u2014 a date, how many hours, and a short description of what they did. Each entry also shows an estimated dollar value.',
      },
      {
        type: 'callout',
        tone: 'warning',
        text: 'That dollar value is an estimate for reporting purposes only \u2014 grant applications, board reports, annual impact reports \u2014 never a tax-deductible gift, and it never counts toward a donor\u2019s lifetime giving total. Nonprofit accounting rules (US GAAP) generally don\u2019t allow ordinary volunteer time to be recognized as contribution revenue, so this is deliberately tracked as its own separate thing, not blended into Gifts.',
      },
      {
        type: 'paragraph',
        text: 'The dollar value uses Independent Sector\u2019s published national rate for the value of a volunteer hour, updated by our team when they republish it (usually every April). Each logged entry keeps the rate that was in effect when it was logged, so past entries never silently change value if the rate is updated later. If your organization uses a different rate \u2014 a state-specific figure for grant reporting, for example \u2014 an Admin can set an override in Settings.',
      },
      {
        type: 'paragraph',
        text: 'Volunteer hours also feed into a donor\u2019s health score as a positive signal on top of logged interactions \u2014 someone who volunteers regularly reads as engaged even if their cash giving is modest. It only ever adds to the score; a donor with no volunteer hours logged scores exactly as they would otherwise.',
      },
      {
        type: 'paragraph',
        text: 'See every logged entry across your whole organization \u2014 totals, top volunteers, and the monthly trend \u2014 on the Volunteer Impact report.',
      },
    ],
  },

  // ── Pipeline & Success Plans ──────────────────────────────────────────
  {
    slug: 'managing-pipeline',
    title: 'Managing your gift pipeline',
    category: 'Pipeline & Success Plans',
    summary: 'Tracking major gift opportunities from identification through close.',
    blocks: [
      {
        type: 'paragraph',
        text: 'The Pipeline tracks major-gift opportunities through four open stages — Identification, Cultivation, Solicitation, Stewardship — before closing as Won or Lost. Each opportunity has an ask amount, an expected close date, and an owner.',
      },
      {
        type: 'paragraph',
        text: 'The dashboard\u2019s "open pipeline" figure and the Pipeline report\u2019s weighted forecast both pull from this data, using each stage\u2019s typical close probability unless you\u2019ve set one specifically on an opportunity.',
      },
    ],
  },
  {
    slug: 'success-plans',
    title: 'Building a donor success plan',
    category: 'Pipeline & Success Plans',
    summary: 'Structured, milestone-based cultivation plans for an individual donor.',
    blocks: [
      {
        type: 'paragraph',
        text: 'A Success Plan is a structured cultivation plan for one donor — a set of milestones (like "schedule a site visit" or "send a stewardship report") with due dates, owned by whichever fundraiser is driving that relationship forward. A plan\u2019s page is organized into three tabs: Overview (the objective and strategy), Milestones, and Notes (a running activity log — stage and status changes, and completed milestones, show up here automatically alongside anything you write yourself).',
      },
      {
        type: 'steps',
        items: [
          'From a donor\u2019s page, create a new Success Plan',
          'Pick a Plan Type — what the plan is actually for (Major Gift Cultivation, Lapsed Donor Recovery, Planned Giving, Stewardship, Onboarding, or General) — separate from the Framework Stage, which is where the donor sits in the relationship overall',
          'Add milestones with due dates, or apply a template to add several at once',
          'Check them off as you complete them',
        ],
      },
      { type: 'heading', text: 'Milestones' },
      {
        type: 'paragraph',
        text: 'Each milestone has a status (Open, In Progress, Done, or Blocked), a priority, a category describing what kind of touch it actually is (Cultivation Call, Stewardship Touch, Ask Conversation, Thank You, Event Invitation, Follow-up, or Other), and an owner — which defaults to the plan\u2019s own owner but can be assigned to someone else.',
      },
      { type: 'heading', text: 'Plan templates' },
      {
        type: 'paragraph',
        text: 'Settings \u2192 Success Plan templates lets you build reusable milestone structures for the kinds of plans you create often, so a fundraiser can apply one instead of building a plan from scratch every time. One is preloaded for every plan type — Major Gift Cultivation, Lapsed Donor Recovery, Planned Giving, Stewardship, Onboarding, and General — and you can apply any template to any plan from its Milestones tab, regardless of which plan type it was originally designed for.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'The Success Plans list has the same My View / Whole Organization toggle as everywhere else — My View shows only plans you personally own.',
      },
    ],
  },

  // ── Grants ───────────────────────────────────────────────────────────
  {
    slug: 'grants-management',
    title: 'Grants Management',
    category: 'Grants',
    summary: 'From researching a funder through the application pipeline, award, and ongoing compliance.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Grants start out looking like a major gift — a Foundation or Corporation donor, an ask, a pipeline of stages — but the moment a grant is actually awarded is the start of a new set of obligations, not the finish line. Grants Management tracks both halves: the application pipeline before you know the answer, and the reporting commitments that come with the money afterward.',
      },
      { type: 'heading', text: 'Before award: the pipeline' },
      {
        type: 'paragraph',
        text: 'A grant opportunity moves through Researching → LOI Submitted → Proposal Submitted → Awarded or Declined. Each one is tied to a Foundation, Corporation, or Organization donor (the funder), with an ask amount and a grant writer — the person managing the application.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Declining a grant prompts for an optional reason, which stays visible on the record afterward — useful when you\u2019re deciding whether to reapply to the same funder later.',
      },
      { type: 'heading', text: 'Requirements checklist' },
      {
        type: 'paragraph',
        text: 'Every funder asks for something different — a Letter of Intent, a budget narrative, a board resolution, audited financials. Track exactly what this specific application needs as a checklist on the grant\u2019s page, so nothing gets missed at submission time.',
      },
      { type: 'heading', text: 'After award: converting to a tracked grant' },
      {
        type: 'paragraph',
        text: 'Once a grant\u2019s stage is set to Awarded, its page shows a "Convert to a tracked grant" option. This is a deliberate, separate step — not automatic — because it\u2019s where a real handoff happens: the grant writer\u2019s job (winning the money) is done, and someone now needs to own the ongoing compliance reporting that comes with it. Converting asks for the award amount, the grant period, any restricted-use notes from the funder, and who\u2019s taking on that compliance role.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'The grant writer and the compliance owner are often different people, and that\u2019s exactly the point — one person winning the grant and a different person managing the reporting afterward is normal, not a data-entry inconsistency.',
      },
      { type: 'heading', text: 'The compliance plan' },
      {
        type: 'paragraph',
        text: 'Once converted, a compliance plan tracks the deliverables owed to the funder — interim reports, a final report with financial reconciliation, a site visit, whatever that specific award requires. This is deliberately separate from the pre-award requirements checklist: missing a compliance deadline can jeopardize the actual money and your standing for renewal, which is a meaningfully bigger stake than an application requirement.',
      },
      { type: 'heading', text: 'Recording disbursements' },
      {
        type: 'paragraph',
        text: 'When grant money actually arrives — including each installment of a multi-year grant — record it as a disbursement on the grant\u2019s page. This creates a real gift record linked back to the grant, so it correctly counts toward the funder\u2019s lifetime giving total and health score exactly like any other gift, while staying traceable back to which grant it came from.',
      },
      { type: 'heading', text: 'Attaching documents' },
      {
        type: 'paragraph',
        text: 'A grant\u2019s page has a Documents section for exactly this — the LOI you submitted, the signed award letter, an interim report, supporting financials. Each one can optionally be tied to the specific requirement or milestone it satisfies, so it\u2019s clear at a glance which checklist item a given file actually proves you completed.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Files are capped at 4MB — comfortably enough for the reports and correspondence these documents usually are.',
      },
      { type: 'heading', text: 'Reporting on grants' },
      {
        type: 'paragraph',
        text: 'Reports → Grant Compliance Report gives you the full picture for one specific grant — requirements, compliance milestones, disbursements, and documents, all exportable. Reports → Grants Portfolio zooms out to every grant across the organization: total awarded versus disbursed, a breakdown by stage, and how many compliance milestones are overdue or due soon right now.',
      },
      { type: 'heading', text: 'Budget and expenses' },
      {
        type: 'paragraph',
        text: 'Once a grant is tracked, its page has a Budget and expenses section — set up planned budget lines (staff time, materials, travel, whatever the grant actually funds), then log real expenses against each one as they happen. A line that goes over its budget is flagged distinctly, not just shown with a fuller progress bar, since that\u2019s a genuinely different situation worth noticing at a glance.',
      },
      { type: 'heading', text: 'Notes and collaboration' },
      {
        type: 'paragraph',
        text: 'A grant\u2019s page also has a running notes feed — a shared place for whoever\u2019s touching that grant to leave updates without emailing each other outside the system. Stage changes, completed milestones, and recorded disbursements show up automatically alongside manual notes, so the feed doubles as a real activity history, not just a comment box.',
      },
      { type: 'heading', text: 'Grant-specific roles' },
      {
        type: 'paragraph',
        text: 'If your organization has people whose main job is grants, Settings → Team lets you assign a Grant Administrator, Grant Finance Manager, Grant Writer, or Grant Reviewer role — alongside their regular Fundraiser/Admin/Viewer role, not instead of it. This is most useful for someone who wouldn\u2019t otherwise have edit access to anything (a board member who\u2019s also your volunteer grants reviewer, for instance) — the grant role gives them exactly the grants access they need without changing what they can do anywhere else in the app.',
      },
      {
        type: 'list',
        items: [
          'Grant Administrator — full control, including deleting a grant entirely',
          'Grant Finance Manager — budget, expenses, disbursements, documents, and notes',
          'Grant Writer — applications, requirements, compliance, documents, and notes',
          'Grant Reviewer — read-only, plus leaving notes',
        ],
      },
      { type: 'heading', text: 'Importing grants from another system' },
      {
        type: 'paragraph',
        text: 'Grants → Import grants brings in a spreadsheet export from whatever you\u2019re migrating from. Funders are matched to an existing donor by organization name, so add the funder as a donor first if they\u2019re not already in the system. This imports the pre-award pipeline — awarded and declined grants come in too, but converting an awarded one into a tracked grant with a compliance plan is still a separate step you do afterward for each one.',
      },
      { type: 'heading', text: 'Where deadlines show up' },
      {
        type: 'paragraph',
        text: 'Dashboard → Grant deadlines pulls together every deadline you need to act on — both application requirements (if you\u2019re a grant writer) and compliance milestones (if you\u2019re a compliance owner) — in one place. Overdue items are called out distinctly from items that are simply due soon, since a missed grant report is treated as a meaningfully bigger problem than a routine reminder.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'The same deadlines are also emailed proactively — 14, 7, and 3 days out, plus once when something first becomes overdue — to the grant writer or compliance owner, whichever role the item belongs to.',
      },
      { type: 'heading', text: 'Tasks on a grant' },
      {
        type: 'paragraph',
        text: 'A grant\u2019s page has its own Tasks section, the same one you\u2019d see on a donor or pipeline record — add a to-do, assign it, set a due date, without leaving the grant. Tasks can also be linked to a grant from the main Tasks list or the task form directly, using the Grant field alongside Donor and Opportunity.',
      },
    ],
  },

  // ── Campaigns ──────────────────────────────────────────────────────────
  {
    slug: 'campaigns-and-sub-campaigns',
    title: 'Campaigns, sub-campaigns, and visibility',
    category: 'Campaigns',
    summary: 'Organizing appeals hierarchically, and controlling who can see them.',
    blocks: [
      {
        type: 'paragraph',
        text: 'A campaign can nest under a parent — for example, "Direct Mail Appeal" and "Year-End Online Push" both living under "2026 Annual Fund." This keeps related appeals grouped without merging their own individual tracking.',
      },
      { type: 'heading', text: 'Visibility' },
      {
        type: 'paragraph',
        text: 'By default every campaign is visible to your whole team. You can restrict a campaign to specific fundraisers instead — useful for something like a major-gifts-only push that shouldn\u2019t clutter everyone else\u2019s view. Restricted campaigns are genuinely hidden from fundraisers who aren\u2019t assigned, not just tucked away — Owners, Admins, and Viewers can always see everything, for oversight.',
      },
    ],
  },

  // ── Email & Communication ─────────────────────────────────────────────
  {
    slug: 'email-templates-and-sending',
    title: 'Email templates and sending to donors',
    category: 'Email & Communication',
    summary: 'Reusable messages, suggested automatically based on a donor\u2019s risk tier.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Admins can build shared email templates (Settings → Email templates) with merge fields like {{firstName}} and {{organizationName}} that fill in automatically. A template can be tagged to a retention risk tier or a campaign — when composing an email for a donor, matching templates sort to the top with a star, though every template stays available regardless.',
      },
      {
        type: 'steps',
        items: [
          'On a donor\u2019s page, click Send Email (requires your email to be connected first — see Connect your email)',
          'Pick a template, or write from scratch',
          'Review the merged text — what you see is exactly what sends',
          'Send',
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Sending logs the email as an interaction automatically, and feeds into that donor\u2019s health score the same way any other logged interaction does.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'A handful of ready-to-use templates come preloaded (Thank You for Your Gift, Annual Impact Update, We\u2019ve Missed You, and more) — check Settings → Email templates before writing one from scratch. If you don\u2019t see them, Settings has a "Load starter templates & sequences" button to add them.',
      },
    ],
  },
  {
    slug: 'success-sequences',
    title: 'Success Sequences',
    category: 'Email & Communication',
    summary: 'Reusable, multi-step stewardship playbooks — every step still requires your click to send.',
    blocks: [
      {
        type: 'paragraph',
        text: 'A Success Sequence is a reusable, ordered set of email touchpoints built from your Email Templates — for example, a new major donor welcome journey, or a check-in sequence for donors showing signs of lapsing. This is not automation: every single step still requires you to review and click Send. Nothing here ever emails a donor without you seeing that exact message first.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Two starter sequences come preloaded — New Major Donor Welcome and At-Risk Donor Recovery — built from the starter email templates. Check Settings → Success sequences before building your own.',
      },
      { type: 'heading', text: 'Starting a sequence for a donor' },
      {
        type: 'steps',
        items: [
          'On a donor\u2019s page, find the Success sequence panel',
          'If the donor\u2019s risk tier matches one, it\u2019ll be suggested there directly — or click "Start a different sequence" to pick any one',
          'The first step becomes due right away; later steps queue up based on each step\u2019s day offset (e.g. day 0, day 14, day 45)',
        ],
      },
      { type: 'heading', text: 'Sending a due step' },
      {
        type: 'paragraph',
        text: 'When a step becomes due, it\u2019s highlighted on the donor\u2019s page with a Send button — and it also shows up on your Dashboard\u2019s "Sequence steps due" panel, which pulls together every due step across all your assigned donors so you have one queue to work through, rather than needing to check individual donor pages.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'A donor can only be in one active sequence at a time. You can end a sequence early from the donor\u2019s page if it\u2019s no longer the right fit.',
      },
      { type: 'heading', text: 'Building your own sequence' },
      {
        type: 'paragraph',
        text: 'Admins can build new sequences from Settings → Success sequences: give it a name, optionally tag it to a retention risk tier so it gets suggested automatically, then add steps — each one is an existing Email Template plus a day offset from when the donor was enrolled.',
      },
    ],
  },

  // ── Reports ────────────────────────────────────────────────────────────
  {
    slug: 'standard-reports',
    title: 'The standard reports',
    category: 'Reports',
    summary: 'Retention, Cohort Analysis, Giving Summary, Segmentation, Pipeline, At-Risk Donors, Volunteer Impact, and two grants reports.',
    blocks: [
      {
        type: 'list',
        items: [
          'Donor Retention — the same calculation as the dashboard, with the full retained/lapsed donor lists behind the headline number',
          'Cohort Analysis — donors grouped by the year of their first gift, tracking what share of each cohort is still giving in every year since',
          'Giving Summary — revenue by month over the last year, broken down by segment; click a month\u2019s bar to see the actual gifts behind it',
          'Donor Segmentation — donor count and lifetime giving by segment and donor type; click any row to see the donors in that group',
          'Major Gifts Pipeline — open value, weighted forecast, and win rate by stage',
          'Lapsed & At-Risk Donors — a ready-to-work outreach list, sorted by urgency',
          'Volunteer Impact — total hours and estimated dollar value contributed, top volunteers, and the monthly trend',
          'Grant Compliance Report — full requirements and compliance status for one grant at a time',
          'Grants Portfolio — the aggregate view across every grant: totals, stage breakdown, overdue compliance',
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Every donor and opportunity name shown in a report links straight to that record. Every report also has a Download CSV button for taking the data elsewhere — a board deck, a mail-merge, wherever it needs to go next.',
      },
    ],
  },

  // ── Salesforce Integration ─────────────────────────────────────────────
  {
    slug: 'connecting-salesforce',
    title: 'Connecting Salesforce',
    category: 'Salesforce Integration',
    summary: 'One connection covers your whole organization, unlike email which is per-person.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Go to Settings → Salesforce (Admin access required)',
          'Click Connect Salesforce',
          'Log in with your organization\u2019s Salesforce credentials and approve access',
        ],
      },
      {
        type: 'paragraph',
        text: 'Once connected, use Sync Now to pull data immediately, or let it run automatically overnight. Results show exactly how many donors, opportunities, and gifts were created or updated, plus anything that was skipped and why.',
      },
    ],
  },
  {
    slug: 'what-syncs-from-salesforce',
    title: 'What syncs from Salesforce (and what doesn\u2019t, yet)',
    category: 'Salesforce Integration',
    summary: 'Contacts, Accounts, Opportunities, and Gifts — plus current limitations worth knowing.',
    blocks: [
      {
        type: 'list',
        items: [
          'Salesforce Contacts → individual donors',
          'Salesforce Accounts → organization donors (Household Accounts, which Nonprofit Success Pack creates automatically behind every Contact, are filtered out on purpose)',
          'Salesforce Opportunities → your Pipeline, attributed to a Contact\u2019s primary contact role first, falling back to the Opportunity\u2019s Account if there\u2019s no contact role set',
          'Closed Won Opportunities → Gifts, logged exactly once each even across repeated syncs',
        ],
      },
      {
        type: 'callout',
        tone: 'warning',
        text: 'Salesforce\u2019s stage names are fully customizable per organization, so open-stage mapping (which of our four open stages an Opportunity maps to) is a best-effort guess based on common naming patterns. Closed Won/Lost is always accurate, since that\u2019s based on standard Salesforce fields, not stage names.',
      },
      {
        type: 'paragraph',
        text: 'This is currently one-way — data flows from Salesforce into Donor Success, not back out. A donor edited here won\u2019t update Salesforce.',
      },
    ],
  },

  // ── Team & Settings ──────────────────────────────────────────────────
  {
    slug: 'inviting-teammates',
    title: 'Inviting teammates',
    category: 'Team & Settings',
    summary: 'One at a time, or several at once from a CSV.',
    blocks: [
      {
        type: 'paragraph',
        text: 'From Settings (Admin access required), invite one teammate at a time with their email and role, or import several at once from a CSV with Name, Email, and Role columns. Either way, they receive a real invitation email to set up their own account — nobody\u2019s account is ever created with a temporary password on their behalf.',
      },
    ],
  },
  {
    slug: 'roles-and-permissions',
    title: 'Roles and permissions',
    category: 'Team & Settings',
    summary: 'Owner, Admin, Fundraiser, and Viewer — what each can do.',
    blocks: [
      {
        type: 'list',
        items: [
          'Owner — full access, including everything Admin can do',
          'Admin — manages team, org settings, integrations (Salesforce, WealthEngine), and can delete records',
          'Fundraiser — full donor and pipeline work: add/edit donors, log gifts and interactions, send email, build success plans',
          'Viewer — read-only access to everything',
        ],
      },
      {
        type: 'paragraph',
        text: 'Roles are set when inviting someone, and can be changed later from Settings → Team by an Admin or Owner.',
      },
    ],
  },
  {
    slug: 'my-view-vs-organization-view',
    title: 'My View vs. Whole Organization',
    category: 'Team & Settings',
    summary: 'The toggle that appears on Dashboard, Donors, Pipeline, and Success Plans.',
    blocks: [
      {
        type: 'paragraph',
        text: 'This toggle scopes what you see to either your own assigned donors and pipeline (My View) or everyone\u2019s (Whole Organization). Fundraisers default to My View; Owners, Admins, and Viewers default to Whole Organization.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'A couple of things stay personal no matter which you pick — Upcoming Tasks and the dashboard\u2019s Needs your attention panel always show your own, since an org-wide task list on your personal dashboard would be noise, not oversight.',
      },
    ],
  },
];

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(category: string): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === category);
}
