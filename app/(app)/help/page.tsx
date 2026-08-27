'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowRight,
  ChevronRight,
  ListChecks,
  Users,
  Target,
  HandCoins,
  Megaphone,
  BarChart3,
  Landmark,
  Globe2,
  UserRoundCog,
  Sparkles,
  BookOpen,
  LifeBuoy,
  LayoutDashboard,
} from 'lucide-react';
import { HELP_CATEGORIES, HELP_ARTICLES } from '@/lib/help/content';
import { CATEGORY_META } from '@/lib/help/category-meta';

const FEATURE_GUIDES = [
  {
    title: 'Donor 360',
    description: 'Health scores, giving history, contacts, interactions, tasks, sequences, and next-best actions in one donor record.',
    href: '/donors',
    keywords: 'donor 360 health score giving history interactions tasks sequences donors',
    icon: Users,
    badge: 'Core',
  },
  {
    title: 'Pipeline & Success Plans',
    description: 'Manage major-gift opportunities and turn cultivation strategy into clear milestones and next steps.',
    href: '/pipeline',
    keywords: 'pipeline opportunities major gifts success plans cultivation milestones',
    icon: Target,
    badge: 'Core',
  },
  {
    title: 'Grants & Allocations',
    description: 'Publish funding rounds, collect applications, review requests, allocate awards, and manage grantees.',
    href: '/funding-rounds',
    keywords: 'grants allocations funding rounds grantees applications awards review compliance',
    icon: HandCoins,
    badge: 'New',
  },
  {
    title: 'Community Portal',
    description: 'Give applicants a branded place to apply, save drafts, upload documents, and track application status.',
    href: '/settings/community-portal',
    keywords: 'community portal applicants application status documents logo branding save continue later',
    icon: Globe2,
    badge: 'New',
  },
  {
    title: 'Board Engagement',
    description: 'Track board members, terms, meetings, participation, and engagement in one connected workspace.',
    href: '/board',
    keywords: 'board engagement board members meetings terms participation governance',
    icon: Landmark,
    badge: 'New',
  },
  {
    title: 'Campaigns',
    description: 'Organize appeals and initiatives, group related activity, and keep campaign performance visible.',
    href: '/campaigns',
    keywords: 'campaigns appeals initiatives fundraising campaign performance',
    icon: Megaphone,
    badge: 'Core',
  },
  {
    title: 'Insights & Reports',
    description: 'Use retention, giving, segmentation, pipeline, at-risk, grants, volunteer reporting, and Jarvis insights to drive action.',
    href: '/reports',
    keywords: 'reports insights jarvis retention giving segmentation pipeline risk grants volunteer analytics',
    icon: BarChart3,
    badge: 'Updated',
  },
  {
    title: 'Team, Profile & Branding',
    description: 'Manage teammates, permissions, your display name, organization settings, and your customer-facing logo.',
    href: '/settings',
    keywords: 'settings team profile username display name logo branding roles permissions invites',
    icon: UserRoundCog,
    badge: 'Updated',
  },
];

const NEW_GUIDES = [
  {
    title: 'New feature walkthrough',
    summary: 'Step-by-step help for Grants & Allocations, Community Portal, Board Engagement, Profile & Branding, and Jarvis Insights.',
    href: '/help/new-features',
    keywords: 'new features grants allocations community portal board profile branding jarvis reports walkthrough',
    icon: Sparkles,
  },
];

const QUICK_STARTS = [
  { title: 'I am new to Donor Success', text: 'Use the guided setup checklist.', href: '/help/getting-started', icon: ListChecks },
  { title: 'Show me what is new', text: 'Walk through the newest platform features.', href: '/help/new-features', icon: Sparkles },
  { title: 'I need to find a feature', text: 'Browse the full product guide below.', href: '#product-guide', icon: LayoutDashboard },
  { title: 'I need help doing something', text: 'Search by task, feature, or keyword.', href: '#search', icon: LifeBuoy },
];

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const q = query.trim().toLowerCase();

  const filteredArticles = useMemo(() => {
    if (!q) return [];
    return HELP_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [q]);

  const filteredFeatures = useMemo(() => {
    if (!q) return [];
    return FEATURE_GUIDES.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.keywords.includes(q),
    );
  }, [q]);

  const filteredNewGuides = useMemo(() => {
    if (!q) return [];
    return NEW_GUIDES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.keywords.includes(q),
    );
  }, [q]);

  const totalResults = filteredFeatures.length + filteredArticles.length + filteredNewGuides.length;

  return (
    <div className="max-w-6xl">
      <section className="overflow-hidden rounded-[22px] bg-evergreen px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/70">
            <Sparkles size={14} /> Donor Success Help Center
          </div>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">What can we help you accomplish?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
            Find the right feature, learn a workflow, or get a quick answer without digging through the platform.
          </p>
          <div id="search" className="relative mt-6 max-w-2xl">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenCategory(null);
              }}
              placeholder="Search: grants, donor health, board, logo, reports..."
              className="w-full rounded-2xl border-0 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:ring-4 focus:ring-white/20"
            />
          </div>
        </div>
      </section>

      {q ? (
        <section className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Search results</h2>
              <p className="mt-1 text-sm text-gray-500">{totalResults} result{totalResults === 1 ? '' : 's'} for “{query}”</p>
            </div>
            <button onClick={() => setQuery('')} className="text-sm font-semibold text-evergreen">Clear search</button>
          </div>

          {filteredNewGuides.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Recommended guides</p>
              {filteredNewGuides.map((guide) => {
                const Icon = guide.icon;
                return (
                  <Link key={guide.href} href={guide.href} className="flex items-center justify-between gap-4 rounded-[16px] border border-evergreen/20 bg-evergreen/5 p-5 hover:border-evergreen/40">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-evergreen text-white"><Icon size={18} /></div>
                      <div><p className="font-bold text-gray-900">{guide.title}</p><p className="mt-1 text-sm text-gray-600">{guide.summary}</p></div>
                    </div>
                    <ChevronRight size={16} className="flex-shrink-0 text-evergreen" />
                  </Link>
                );
              })}
            </div>
          )}

          {filteredFeatures.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Product areas</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredFeatures.map((feature) => <FeatureCard key={feature.title} feature={feature} compact />)}
              </div>
            </div>
          )}

          {filteredArticles.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Help articles</p>
              <div className="flex flex-col gap-2">
                {filteredArticles.map((a) => <ArticleRow key={a.slug} slug={a.slug} title={a.title} summary={a.summary} />)}
              </div>
            </div>
          )}

          {totalResults === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <BookOpen className="mx-auto text-gray-400" size={24} />
              <p className="mt-3 font-semibold text-gray-900">We couldn’t find that yet.</p>
              <p className="mt-1 text-sm text-gray-500">Try a broader term like donor, grants, campaign, board, report, or settings.</p>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_STARTS.map(({ title, text, href, icon: Icon }) => (
              <Link key={title} href={href} className="group rounded-[18px] border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-evergreen/40 hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-evergreen/10 text-evergreen"><Icon size={19} /></div>
                <p className="mt-4 font-bold text-gray-900">{title}</p>
                <p className="mt-1 text-[13px] leading-5 text-gray-600">{text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-evergreen">Go <ArrowRight size={13} /></span>
              </Link>
            ))}
          </section>

          <Link href="/help/new-features" className="mt-8 flex flex-col gap-4 rounded-[18px] border border-teal/20 bg-teal/5 p-6 transition hover:border-teal/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal text-white"><Sparkles size={19} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">New & Updated</p>
                <p className="mt-1 font-extrabold text-gray-900">Learn the newest Donor Success workflows</p>
                <p className="mt-1 text-sm text-gray-600">Grants & Allocations, Community Portal, Board Engagement, profile and organization branding, and Jarvis Insights.</p>
              </div>
            </div>
            <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-bold text-evergreen">View walkthrough <ArrowRight size={14} /></span>
          </Link>

          <section id="product-guide" className="mt-9">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-evergreen">Product guide</p>
                <h2 className="mt-1 text-xl font-extrabold text-gray-900">Everything you can do in Donor Success</h2>
                <p className="mt-1 text-sm text-gray-600">Start with the outcome you are trying to accomplish.</p>
              </div>
              <Link href="/help/getting-started" className="inline-flex items-center gap-1.5 text-sm font-semibold text-evergreen">Setup checklist <ArrowRight size={14} /></Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURE_GUIDES.map((feature) => <FeatureCard key={feature.title} feature={feature} />)}
            </div>
          </section>

          <section className="mt-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Learn by topic</p>
            <h2 className="mt-1 text-xl font-extrabold text-gray-900">Browse Success Hub guides</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {HELP_CATEGORIES.map((category) => {
                const articles = HELP_ARTICLES.filter((a) => a.category === category);
                if (articles.length === 0) return null;
                const meta = CATEGORY_META[category];
                if (!meta) return null;
                const Icon = meta.icon;
                const isOpen = openCategory === category;
                return (
                  <button key={category} type="button" onClick={() => setOpenCategory(isOpen ? null : category)} className={`rounded-[16px] border bg-white p-5 text-left transition ${isOpen ? 'border-evergreen ring-2 ring-evergreen/10' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.iconBg}`}><Icon size={18} className={meta.iconColor} /></div>
                      <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-500">{articles.length} guide{articles.length === 1 ? '' : 's'}</span>
                    </div>
                    <p className="mt-3 font-semibold text-gray-900">{category}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-gray-600">{CATEGORY_TAGLINES[category]}</p>
                  </button>
                );
              })}
            </div>

            {openCategory && (
              <div className="mt-4 overflow-hidden rounded-[16px] border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <div><p className="text-[13px] font-bold text-gray-900">{openCategory}</p><p className="mt-0.5 text-xs text-gray-500">Choose a guide to keep going.</p></div>
                  <button onClick={() => setOpenCategory(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-800">Close</button>
                </div>
                {HELP_ARTICLES.filter((a) => a.category === openCategory).map((a) => (
                  <Link key={a.slug} href={`/help/${a.slug}`} className="flex items-center justify-between gap-4 border-b border-gray-50 px-5 py-4 transition last:border-0 hover:bg-gray-50">
                    <div className="min-w-0"><div className="text-[14px] font-semibold text-gray-900">{a.title}</div><div className="mt-0.5 text-[12.5px] leading-5 text-gray-600">{a.summary}</div></div>
                    <ChevronRight size={15} className="flex-shrink-0 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10 rounded-[18px] border border-gray-200 bg-gray-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div><p className="font-bold text-gray-900">Still need help?</p><p className="mt-1 text-sm text-gray-600">Use the in-app chat for a quick answer, or open the guide closest to what you are trying to do.</p></div>
            <Link href="/help/welcome" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-evergreen px-4 py-2.5 text-sm font-semibold text-white sm:mt-0">Start with the overview <ArrowRight size={14} /></Link>
          </section>
        </>
      )}
    </div>
  );
}

const CATEGORY_TAGLINES: Record<string, string> = {
  'Getting Started': 'Setup, navigation, dashboard, and the basics.',
  Donors: 'Records, health scores, giving history, and relationship activity.',
  'Pipeline & Success Plans': 'Major gifts, opportunities, cultivation, and milestones.',
  Grants: 'Grant tracking, awards, requirements, and compliance.',
  Campaigns: 'Appeals, initiatives, sub-campaigns, and visibility.',
  'Email & Communication': 'Connected email, templates, sequences, and outreach.',
  Reports: 'Retention, giving, segmentation, pipeline, risk, grants, and impact.',
  'Salesforce Integration': 'Connect Salesforce and understand what syncs.',
  'Team & Settings': 'Roles, invites, permissions, profiles, and organization settings.',
};

type Feature = (typeof FEATURE_GUIDES)[number];

function FeatureCard({ feature, compact = false }: { feature: Feature; compact?: boolean }) {
  const Icon = feature.icon;
  return (
    <Link href={feature.href} className={`group rounded-[16px] border border-gray-200 bg-white transition hover:border-evergreen/40 hover:shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-evergreen/10 text-evergreen"><Icon size={19} /></div>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${feature.badge === 'New' ? 'bg-teal/10 text-teal' : feature.badge === 'Updated' ? 'bg-warning/10 text-warning' : 'bg-gray-100 text-gray-500'}`}>{feature.badge}</span>
      </div>
      <p className="mt-3 font-bold text-gray-900">{feature.title}</p>
      <p className="mt-1 text-[12.5px] leading-5 text-gray-600">{feature.description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-evergreen">Open feature <ChevronRight size={13} /></span>
    </Link>
  );
}

function ArticleRow({ slug, title, summary }: { slug: string; title: string; summary: string }) {
  return (
    <Link href={`/help/${slug}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 transition hover:border-gray-300 hover:shadow-sm">
      <div className="min-w-0"><div className="font-semibold text-gray-900">{title}</div><div className="mt-0.5 text-[13px] leading-5 text-gray-600">{summary}</div></div>
      <ChevronRight size={16} className="flex-shrink-0 text-gray-400" />
    </Link>
  );
}
