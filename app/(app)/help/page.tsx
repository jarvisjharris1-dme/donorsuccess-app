'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, ChevronRight, ListChecks } from 'lucide-react';
import { HELP_CATEGORIES, HELP_ARTICLES } from '@/lib/help/content';
import { CATEGORY_META } from '@/lib/help/category-meta';

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? HELP_ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q),
      )
    : null;

  function toggleCategory(category: string) {
    setOpenCategory((current) => (current === category ? null : category));
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Success Hub</h1>
          <p className="mt-1 text-sm text-gray-600">Guides for everything in Donor Success.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenCategory(null);
            }}
            placeholder="Search Success Hub..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
        </div>
      </div>

      {filtered ? (
        <div className="mt-6 flex flex-col gap-2">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              No articles match &ldquo;{query}&rdquo;.
            </p>
          )}
          {filtered.map((a) => (
            <ArticleRow key={a.slug} slug={a.slug} title={a.title} summary={a.summary} />
          ))}
        </div>
      ) : (
        <>
          {/* Featured Getting Started banner */}
          <Link
            href="/help/getting-started"
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[16px] bg-evergreen/10 px-6 py-5 transition-colors hover:bg-evergreen/[0.14]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-evergreen">
                <ListChecks size={20} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-evergreen">Getting Started checklist</p>
                <p className="text-[13px] text-evergreen/80">7 steps to get your team fully set up</p>
              </div>
            </div>
            <span className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-evergreen px-4 py-2.5 text-[13.5px] font-semibold text-white">
              Start here
              <ArrowRight size={14} />
            </span>
          </Link>

          {/* Category tile grid */}
          <p className="mb-3 mt-8 text-[13px] font-bold uppercase tracking-wide text-gray-500">
            Browse by section
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HELP_CATEGORIES.map((category) => {
              const articles = HELP_ARTICLES.filter((a) => a.category === category);
              if (articles.length === 0) return null;
              const meta = CATEGORY_META[category];
              const Icon = meta.icon;
              const isOpen = openCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`rounded-[16px] border bg-white p-5 text-left transition-colors ${
                    isOpen ? 'border-evergreen' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.iconBg}`}>
                    <Icon size={18} className={meta.iconColor} />
                  </div>
                  <p className="mt-2.5 font-semibold text-gray-900">{category}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-gray-600">
                    {CATEGORY_TAGLINES[category]}
                  </p>
                  <p className="mt-2.5 text-[12px] text-gray-500">
                    {articles.length} article{articles.length === 1 ? '' : 's'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Expanded section for the selected category */}
          {openCategory && (
            <div className="mt-4 overflow-hidden rounded-[16px] border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <p className="text-[13px] font-bold uppercase tracking-wide text-gray-500">
                  {openCategory}
                </p>
              </div>
              {HELP_ARTICLES.filter((a) => a.category === openCategory).map((a) => (
                <Link
                  key={a.slug}
                  href={`/help/${a.slug}`}
                  className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5 transition-colors last:border-0 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-gray-900">{a.title}</div>
                    <div className="mt-0.5 truncate text-[12.5px] text-gray-600">{a.summary}</div>
                  </div>
                  <ChevronRight size={15} className="flex-shrink-0 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const CATEGORY_TAGLINES: Record<string, string> = {
  'Getting Started': 'Your first steps in Donor Success',
  Donors: 'Records, health scores, contacts',
  'Pipeline & Success Plans': 'Major gifts and cultivation plans',
  Grants: 'Applications, awards, and compliance',
  Campaigns: 'Appeals, sub-campaigns, visibility',
  'Email & Communication': 'Templates and sending to donors',
  Reports: 'The five standard reports',
  'Salesforce Integration': 'Connecting and what syncs',
  'Team & Settings': 'Roles, invites, permissions',
};

function ArticleRow({ slug, title, summary }: { slug: string; title: string; summary: string }) {
  return (
    <Link
      href={`/help/${slug}`}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-gray-300"
    >
      <div className="min-w-0">
        <div className="font-semibold text-gray-900">{title}</div>
        <div className="mt-0.5 truncate text-[13px] text-gray-600">{summary}</div>
      </div>
      <ChevronRight size={16} className="flex-shrink-0 text-gray-400" />
    </Link>
  );
}
