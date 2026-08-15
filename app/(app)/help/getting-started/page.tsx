import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

type ChecklistItem = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  helpHref?: string;
};

const STEPS: ChecklistItem[] = [
  {
    title: 'Connect your email',
    description:
      'Send donor emails from your own Gmail or Outlook inbox, tracked automatically on each donor\u2019s record.',
    actionLabel: 'Go to Settings',
    actionHref: '/settings',
    helpHref: '/help/connect-your-email',
  },
  {
    title: 'Bring in your donor data',
    description:
      'Import from a CSV, connect Salesforce for ongoing sync, or add donors one at a time \u2014 whatever fits how your data lives today.',
    actionLabel: 'Import donors',
    actionHref: '/donors/import',
    helpHref: '/help/importing-donors-csv',
  },
  {
    title: 'Connect Salesforce (if you use it)',
    description:
      'One connection covers your whole organization. Pulls in Contacts, Accounts, Opportunities, and gift history, and keeps syncing automatically overnight.',
    actionLabel: 'Go to Settings',
    actionHref: '/settings',
    helpHref: '/help/connecting-salesforce',
  },
  {
    title: 'Invite your team',
    description:
      'One at a time, or import a whole roster from a CSV. Everyone sets up their own password \u2014 nobody\u2019s account is created for them.',
    actionLabel: 'Go to Settings',
    actionHref: '/settings',
    helpHref: '/help/inviting-teammates',
  },
  {
    title: 'Assign donors to fundraisers',
    description:
      'Assigning a donor to a specific person is what makes them show up in that person\u2019s My View \u2014 their own personal book of business.',
    actionLabel: 'Go to Donors',
    actionHref: '/donors',
    helpHref: '/help/my-view-vs-organization-view',
  },
  {
    title: 'Take a look at your Dashboard',
    description:
      'Retention rate, open pipeline, and which donors need attention right now \u2014 this is where every day should start.',
    actionLabel: 'Go to Dashboard',
    actionHref: '/dashboard',
    helpHref: '/help/dashboard-overview',
  },
  {
    title: 'Set up an email template',
    description:
      'A handful of ready-to-use templates are already preloaded \u2014 Thank You, Annual Impact Update, We\u2019ve Missed You, and more. Check what\u2019s there, tweak the tone to fit your voice, or add your own.',
    actionLabel: 'Manage templates',
    actionHref: '/settings/email-templates',
    helpHref: '/help/email-templates-and-sending',
  },
  {
    title: 'Explore your Success Sequences',
    description:
      'Two starter sequences are already built from those templates \u2014 a new major donor welcome journey and an at-risk donor recovery check-in. Enroll a donor, or build your own multi-step sequence.',
    actionLabel: 'Manage sequences',
    actionHref: '/settings/sequence-templates',
    helpHref: '/help/success-sequences',
  },
];

export default function GettingStartedPage() {
  return (
    <div className="max-w-3xl">
      <Link
        href="/help"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Success Hub
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Getting Started</h1>
      <p className="mt-1 text-sm text-gray-600">
        The setup steps that make everything else in Donor Success work well, roughly in the order
        they matter. Nothing here is required in this exact order \u2014 but skipping straight to the
        Dashboard before donor data and team assignments exist will just look empty.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex gap-4 rounded-[16px] border border-gray-200 bg-white p-5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-evergreen/10 text-[13px] font-bold text-evergreen">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-gray-900">{step.title}</h2>
              <p className="mt-1 text-[14px] text-gray-600">{step.description}</p>
              <div className="mt-3 flex items-center gap-4">
                <Link
                  href={step.actionHref}
                  className="rounded-lg bg-evergreen px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d685f]"
                >
                  {step.actionLabel}
                </Link>
                {step.helpHref && (
                  <Link
                    href={step.helpHref}
                    className="text-[13px] font-semibold text-gray-600 hover:text-gray-900"
                  >
                    Read more
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-[16px] border border-success/30 bg-success/5 p-5">
        <CheckCircle2 size={20} className="flex-shrink-0 text-success" />
        <p className="text-sm text-gray-700">
          Once these are done, the rest of Donor Success mostly runs itself \u2014 health scores
          recalculate automatically, and the Dashboard surfaces what needs attention every day.
        </p>
      </div>
    </div>
  );
}
