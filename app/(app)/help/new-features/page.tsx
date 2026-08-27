import Link from 'next/link';
import { ArrowLeft, ArrowRight, Globe2, HandCoins, Landmark, UserRoundCog, BarChart3, Sparkles } from 'lucide-react';

const GUIDES = [
  {
    id: 'grants', title: 'Grants & Allocations', icon: HandCoins,
    summary: 'Run pooled funding from opportunity setup through review, allocation, and award decisions.',
    steps: ['Create a funding round with the funding pool, dates, service categories, and scoring rubric.', 'Open the round when it is ready for applicants and share its public application.', 'Review certifications, requested categories, program details, and reviewer scoring.', 'Record allocation decisions for requested categories and move the round through its decision lifecycle.', 'Use Grantees and grant reports to follow the funded portfolio.'],
    tip: 'Grant permissions are additive to the normal Donor Success role, so reviewers can receive grant access without broader administrative access.',
    action: '/funding-rounds', actionLabel: 'Open Allocations', learn: '/help/funding-rounds-workflow', learnLabel: 'Read the funding round guide',
  },
  {
    id: 'community-portal', title: 'Community Portal', icon: Globe2,
    summary: 'Give applicants a branded place to apply, save work, upload documents, and track status without an internal Donor Success account.',
    steps: ['Upload your organization logo in Settings.', 'Preview the applicant-facing experience before sharing a funding opportunity.', 'Applicants can submit immediately or save and continue later.', 'Returning applicants can continue drafts, upload supporting documents, and track application status.', 'Your organization remains the primary brand while Donor Success powers the experience.'],
    tip: 'The Community Portal is intentionally separate from your internal Donor Success login.',
    action: '/settings/community-portal', actionLabel: 'Open Portal Branding', learn: '/help/community-portal-applicant-experience', learnLabel: 'Understand the applicant experience',
  },
  {
    id: 'board', title: 'Board Engagement', icon: Landmark,
    summary: 'Manage board structure and understand engagement without keeping a second spreadsheet.',
    steps: ['Open Board Engagement and establish the active board.', 'Add committees and board members.', 'Manage member terms, roles, committee assignments, commitments, and engagement information.', 'Log meetings and attendance so participation becomes visible over time.', 'Use the board overview to keep governance engagement visible alongside relationship work.'],
    tip: 'Board Engagement adds governance context without creating a duplicate relationship record.',
    action: '/board', actionLabel: 'Open Board Engagement', learn: '/help/board-engagement-overview', learnLabel: 'Read the Board Engagement guide',
  },
  {
    id: 'profile-branding', title: 'Profile, Team & Organization Branding', icon: UserRoundCog,
    summary: 'Keep user identity, organization branding, permissions, and team access current from Settings.',
    steps: ['Update the display name shown across Donor Success from Your Profile.', 'Admins and Owners can update the organization profile and organization logo.', 'Use Team settings to manage roles, grant-specific roles, active status, and access.', 'Invite teammates individually or use CSV onboarding when appropriate.', 'Keep integrations, templates, scoring, billing, and other organization settings current.'],
    tip: 'Changing a display name does not change the login email.',
    action: '/settings', actionLabel: 'Open Settings', learn: '/help/profile-and-organization-branding', learnLabel: 'Read the profile & branding guide',
  },
  {
    id: 'insights', title: 'Jarvis Insights & Reports', icon: BarChart3,
    summary: 'Move from static reporting to questions, decisions, and action using current organization data.',
    steps: ['Use Reports for structured views of retention, cohorts, giving, segmentation, pipeline, risk, grants, and impact.', 'Open a report when you need repeatable analysis or an export.', 'Use Jarvis when you want to start with a question in plain language.', 'Take what you learn back into the donor, pipeline, or reporting workflow to act.'],
    tip: 'Use Reports for repeatable structure. Use Jarvis when you are exploring a question or trying to understand what the data is telling you.',
    action: '/insights', actionLabel: 'Ask Jarvis', learn: '/help/jarvis-insights', learnLabel: 'Learn how to use Jarvis',
  },
];

export default function NewFeaturesHelpPage() {
  return (
    <div className="max-w-5xl">
      <Link href="/help" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"><ArrowLeft size={14} /> Success Hub</Link>
      <div className="mt-4 rounded-[22px] bg-evergreen px-6 py-7 text-white sm:px-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-white/70"><Sparkles size={14} /> New & Updated</div>
        <h1 className="mt-2 text-3xl font-extrabold">New Donor Success feature guide</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80">A practical walkthrough of the newest platform capabilities, plus deeper Success Hub guides when you need step-by-step help.</p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {GUIDES.map((guide) => { const Icon = guide.icon; return <a key={guide.id} href={`#${guide.id}`} className="rounded-[16px] border border-gray-200 bg-white p-4 transition hover:border-evergreen/40 hover:shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-evergreen/10 text-evergreen"><Icon size={18} /></div><p className="mt-3 text-sm font-bold text-gray-900">{guide.title}</p></a>; })}
      </div>
      <div className="mt-8 flex flex-col gap-6">
        {GUIDES.map((guide) => { const Icon = guide.icon; return (
          <section key={guide.id} id={guide.id} className="scroll-mt-6 rounded-[18px] border border-gray-200 bg-white p-6 sm:p-7">
            <div className="flex items-start gap-4"><div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-evergreen/10 text-evergreen"><Icon size={20} /></div><div><h2 className="text-xl font-extrabold text-gray-900">{guide.title}</h2><p className="mt-1 text-sm leading-6 text-gray-600">{guide.summary}</p></div></div>
            <ol className="mt-6 flex flex-col gap-4">{guide.steps.map((step, index) => <li key={step} className="flex items-start gap-3 text-sm leading-6 text-gray-700"><span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-evergreen/10 text-xs font-bold text-evergreen">{index + 1}</span><span>{step}</span></li>)}</ol>
            <div className="mt-6 rounded-xl bg-sky/10 px-4 py-3.5 text-sm leading-6 text-gray-700"><strong className="text-gray-900">Good to know:</strong> {guide.tip}</div>
            <div className="mt-5 flex flex-wrap items-center gap-4"><Link href={guide.action} className="inline-flex items-center gap-1.5 rounded-xl bg-evergreen px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d685f]">{guide.actionLabel} <ArrowRight size={14} /></Link><Link href={guide.learn} className="inline-flex items-center gap-1.5 text-sm font-semibold text-evergreen">{guide.learnLabel} <ArrowRight size={14} /></Link></div>
          </section>
        ); })}
      </div>
    </div>
  );
}
