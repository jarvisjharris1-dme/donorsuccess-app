import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';

type ChecklistItem = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  helpHref?: string;
  optional?: boolean;
};

const FOUNDATION_STEPS: ChecklistItem[] = [
  {
    title: 'Complete your profile & organization branding',
    description:
      'Set the name you want displayed in Donor Success and, if you are an administrator, add your organization logo for customer-facing experiences.',
    actionLabel: 'Open Settings',
    actionHref: '/settings',
  },
  {
    title: 'Connect your email',
    description:
      'Send donor emails from your own Gmail or Outlook inbox, tracked automatically on each donor’s record.',
    actionLabel: 'Go to Settings',
    actionHref: '/settings',
    helpHref: '/help/connect-your-email',
  },
  {
    title: 'Bring in your donor data',
    description:
      'Import from a CSV, connect Salesforce for ongoing sync, or add donors one at a time — whatever fits how your data lives today.',
    actionLabel: 'Import donors',
    actionHref: '/donors/import',
    helpHref: '/help/importing-donors-csv',
  },
  {
    title: 'Connect Salesforce',
    description:
      'If your organization uses Salesforce, connect it once to pull Contacts, Accounts, Opportunities, and gift history into Donor Success.',
    actionLabel: 'Go to Settings',
    actionHref: '/settings',
    helpHref: '/help/connecting-salesforce',
    optional: true,
  },
  {
    title: 'Invite your team',
    description:
      'Invite teammates one at a time or import a roster from CSV, then give each person the right role and access.',
    actionLabel: 'Manage team',
    actionHref: '/settings',
    helpHref: '/help/inviting-teammates',
  },
  {
    title: 'Assign donors to fundraisers',
    description:
      'Assignments create each fundraiser’s My View — their focused book of business and the relationships they own.',
    actionLabel: 'Go to Donors',
    actionHref: '/donors',
    helpHref: '/help/my-view-vs-organization-view',
  },
];

const ADOPTION_STEPS: ChecklistItem[] = [
  {
    title: 'Start every day with the Dashboard',
    description:
      'See retention, pipeline, donor health, and the relationships that need attention now. The Dashboard turns your data into a daily action list.',
    actionLabel: 'Open Dashboard',
    actionHref: '/dashboard',
    helpHref: '/help/dashboard-overview',
  },
  {
    title: 'Set up your stewardship playbook',
    description:
      'Review the starter email templates and Success Sequences, then tailor them to your organization’s voice and donor journey.',
    actionLabel: 'Manage sequences',
    actionHref: '/settings/sequence-templates',
    helpHref: '/help/success-sequences',
  },
  {
    title: 'Build your major-gift pipeline',
    description:
      'Create opportunities, track cultivation stages, and use Success Plans to make the next move on important donor relationships clear.',
    actionLabel: 'Open Pipeline',
    actionHref: '/pipeline',
  },
  {
    title: 'Set up Board Engagement',
    description:
      'Bring board members, terms, meetings, and participation into the same operating view as your fundraising work.',
    actionLabel: 'Open Board',
    actionHref: '/board',
    optional: true,
  },
  {
    title: 'Configure Grants & Allocations',
    description:
      'If your organization funds community agencies, create funding rounds, define categories and scoring, and prepare your application workflow.',
    actionLabel: 'Open Funding Rounds',
    actionHref: '/funding-rounds',
    optional: true,
  },
  {
    title: 'Preview your Community Portal',
    description:
      'For organizations using Grants & Allocations, confirm your logo and applicant experience before sharing a public funding opportunity.',
    actionLabel: 'Preview Portal',
    actionHref: '/settings/community-portal',
    optional: true,
  },
  {
    title: 'Ask Jarvis what needs attention',
    description:
      'Use plain language to explore your organization’s donor data and turn current numbers into practical next actions.',
    actionLabel: 'Ask Jarvis',
    actionHref: '/insights',
  },
  {
    title: 'Review the reports that drive retention',
    description:
      'Use retention, cohorts, giving, segmentation, pipeline, at-risk, grants, and impact reporting to see what is working and where to act next.',
    actionLabel: 'Open Reports',
    actionHref: '/reports',
  },
];

function StepList({ steps, startAt = 1 }: { steps: ChecklistItem[]; startAt?: number }) {
  return (
    <div className="mt-5 flex flex-col gap-3">
      {steps.map((step, i) => (
        <div key={step.title} className="flex gap-4 rounded-[16px] border border-gray-200 bg-white p-5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-evergreen/10 text-[13px] font-bold text-evergreen">
            {startAt + i}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-gray-900">{step.title}</h3>
              {step.optional && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">When applicable</span>}
            </div>
            <p className="mt-1 text-[14px] leading-6 text-gray-600">{step.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Link href={step.actionHref} className="rounded-lg bg-evergreen px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d685f]">
                {step.actionLabel}
              </Link>
              {step.helpHref && <Link href={step.helpHref} className="text-[13px] font-semibold text-gray-600 hover:text-gray-900">Read more</Link>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GettingStartedPage() {
  return (
    <div className="max-w-4xl">
      <Link href="/help" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} /> Success Hub
      </Link>

      <div className="mt-3 overflow-hidden rounded-[22px] bg-evergreen px-6 py-7 text-white sm:px-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/70"><Sparkles size={14} /> Guided adoption path</div>
        <h1 className="mt-2 text-3xl font-extrabold">Get Donor Success working for your organization</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
          Start with the foundation, then move into the workflows that turn donor data into stronger relationships, better retention, and clearer community impact.
        </p>
      </div>

      <section className="mt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-evergreen">Phase 1 · Foundation</p>
        <h2 className="mt-1 text-xl font-extrabold text-gray-900">Get your organization ready</h2>
        <p className="mt-1 text-sm text-gray-600">These are the core setup steps. Complete them first so dashboards, assignments, outreach, and reporting have the right data behind them.</p>
        <StepList steps={FOUNDATION_STEPS} />
      </section>

      <section className="mt-10">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-evergreen">Phase 2 · Adoption</p>
        <h2 className="mt-1 text-xl font-extrabold text-gray-900">Put the platform to work</h2>
        <p className="mt-1 text-sm text-gray-600">Once the foundation is in place, build the operating habits and workflows that make Donor Success valuable every week.</p>
        <StepList steps={ADOPTION_STEPS} startAt={FOUNDATION_STEPS.length + 1} />
      </section>

      <div className="mt-8 flex items-start gap-3 rounded-[16px] border border-success/30 bg-success/5 p-5">
        <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-success" />
        <div>
          <p className="text-sm font-bold text-gray-900">The goal is adoption, not just setup.</p>
          <p className="mt-1 text-sm leading-6 text-gray-700">Once your data, team, and core workflows are connected, Donor Success can surface risks, opportunities, next actions, and reporting without your team rebuilding the picture every week.</p>
        </div>
      </div>

      <div className="mt-5 text-center">
        <Link href="/help/new-features" className="text-sm font-semibold text-evergreen hover:underline">See the New & Updated Feature Guide →</Link>
      </div>
    </div>
  );
}
