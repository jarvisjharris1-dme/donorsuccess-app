import Link from 'next/link';
import { ArrowLeft, ArrowRight, Globe2, HandCoins, Landmark, UserRoundCog, BarChart3, Sparkles } from 'lucide-react';

const GUIDES = [
  {
    id: 'grants',
    title: 'Grants & Allocations',
    icon: HandCoins,
    summary: 'Run pooled funding from opportunity setup through review, allocation, and award decisions.',
    steps: [
      'Go to Allocations and create a funding round with the funding pool, dates, service categories, and scoring rubric.',
      'Open the round when it is ready for applicants. The round page gives you a public application link you can share.',
      'Applications appear in the round automatically. Open an application to review certifications, requested categories, program details, and reviewer scoring.',
      'Use the allocation decision area to record what is awarded for each requested category, then move the round through its decision lifecycle.',
      'Use Grantees to see each funded agency, application history, EIN, and lifetime awarded amount in one place.',
    ],
    tip: 'Grant permissions are additive to the normal Donor Success role. Admins can assign a grant-specific role from Settings when a reviewer needs grant access without broader administrative access.',
    action: '/funding-rounds',
    actionLabel: 'Open Allocations',
  },
  {
    id: 'community-portal',
    title: 'Community Portal',
    icon: Globe2,
    summary: 'Give applicants a branded place to apply, save work, upload documents, and track status without a Donor Success user account.',
    steps: [
      'Go to Settings and upload your organization logo. That logo becomes the funding organization brand across public application and applicant portal pages.',
      'From a funding round, use Public application to open the exact applicant-facing page for that opportunity.',
      'Applicants can submit immediately or choose Save & Continue Later. Saving creates their Community Portal access and sends a secure magic link to their email.',
      'Returning applicants sign in through the Community Portal to see their applications, continue drafts, upload supporting documents, and track current status.',
      'Your organization remains the primary brand while Donor Success is shown as the platform powering the experience.',
    ],
    tip: 'The Community Portal is intentionally separate from your internal Donor Success login. Applicants never need access to your donor database or internal workspace.',
    action: '/settings/community-portal',
    actionLabel: 'Open Portal Branding',
  },
  {
    id: 'board',
    title: 'Board Engagement',
    icon: Landmark,
    summary: 'Manage board structure and understand engagement without keeping a second spreadsheet.',
    steps: [
      'Open Board Engagement and create the active board if one has not been set up yet.',
      'Add committees and board members. Board members are connected to donor records so relationship and giving context stays connected.',
      'Open a member to manage their term, role, committee assignments, commitments, and engagement information.',
      'Log board or committee meetings and record attendance so participation becomes visible over time.',
      'Use the board overview to quickly see active members, committees, commitment completion, attendance, and recent meetings.',
    ],
    tip: 'A board member can still be cultivated as a donor. Board Engagement adds governance context without creating a duplicate person record.',
    action: '/board',
    actionLabel: 'Open Board Engagement',
  },
  {
    id: 'profile-branding',
    title: 'Profile, Team & Organization Branding',
    icon: UserRoundCog,
    summary: 'Keep user identity, organization branding, permissions, and team access current from one settings area.',
    steps: [
      'Every user can open Settings and update the display name shown across Donor Success from Your Profile.',
      'Admins and Owners can update the organization profile and upload the organization logo used in the platform and Community Portal.',
      'Use Team to change roles, grant-specific roles, active status, and password-reset access for teammates.',
      'Use Invite a teammate for individual invitations or the CSV import option when onboarding several users at once.',
      'Settings also houses email, Salesforce, WealthEngine, Success Sequence, Success Plan template, scoring, billing, and navigation controls.',
    ],
    tip: 'Changing a display name does not change the login email. It updates how the person is shown inside Donor Success.',
    action: '/settings',
    actionLabel: 'Open Settings',
  },
  {
    id: 'insights',
    title: 'Jarvis Insights & Reports',
    icon: BarChart3,
    summary: 'Move from static reporting to questions, decisions, and action using current organization data.',
    steps: [
      'Open Reports for standard views covering donor retention, cohort analysis, giving, segmentation, pipeline, at-risk donors, volunteer impact, grants portfolio, and grant compliance.',
      'Open any report to work the underlying records and export the data to CSV when you need it outside Donor Success.',
      'Use Jarvis Insights when you want to ask a question in plain language instead of building a report yourself.',
      'Jarvis answers from your organization’s current Donor Success data, helping you move from “what happened?” to “what should I look at next?” faster.',
    ],
    tip: 'Use Reports when you need a repeatable, structured view. Use Jarvis when you are exploring a question or trying to understand what the data is telling you.',
    action: '/reports',
    actionLabel: 'Open Reports',
  },
];

export default function NewFeaturesHelpPage() {
  return (
    <div className="max-w-5xl">
      <Link href="/help" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} /> Success Hub
      </Link>

      <div className="mt-4 rounded-[22px] bg-evergreen px-6 py-7 text-white sm:px-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-white/70"><Sparkles size={14} /> New & Updated</div>
        <h1 className="mt-2 text-3xl font-extrabold">New Donor Success feature guide</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80">A practical walkthrough of the newest platform capabilities and where they fit into your day-to-day work.</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <a key={guide.id} href={`#${guide.id}`} className="rounded-[16px] border border-gray-200 bg-white p-4 transition hover:border-evergreen/40 hover:shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-evergreen/10 text-evergreen"><Icon size={18} /></div>
              <p className="mt-3 text-sm font-bold text-gray-900">{guide.title}</p>
            </a>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <section key={guide.id} id={guide.id} className="scroll-mt-6 rounded-[18px] border border-gray-200 bg-white p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-evergreen/10 text-evergreen"><Icon size={20} /></div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">{guide.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{guide.summary}</p>
                </div>
              </div>

              <ol className="mt-6 flex flex-col gap-4">
                {guide.steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-sm leading-6 text-gray-700">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-evergreen/10 text-xs font-bold text-evergreen">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-xl bg-sky/10 px-4 py-3.5 text-sm leading-6 text-gray-700"><strong className="text-gray-900">Good to know:</strong> {guide.tip}</div>

              <Link href={guide.action} className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-evergreen px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d685f]">
                {guide.actionLabel} <ArrowRight size={14} />
              </Link>
            </section>
          );
        })}
      </div>
    </div>
  );
}
