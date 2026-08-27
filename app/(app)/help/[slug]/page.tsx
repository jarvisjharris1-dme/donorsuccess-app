import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { HELP_ARTICLES } from '@/lib/help/content';
import { EXPANDED_HELP_ARTICLES } from '@/lib/help/expanded-content';
import HelpBlocks from '@/components/help/HelpBlocks';

const ALL_ARTICLES = [...HELP_ARTICLES, ...EXPANDED_HELP_ARTICLES];

export default function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = ALL_ARTICLES.find((a) => a.slug === params.slug);
  if (!article) notFound();

  const related = ALL_ARTICLES.filter((a) => a.category === article.category && a.slug !== article.slug);

  return (
    <div className="max-w-3xl">
      <Link href="/help" className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} /> Success Hub
      </Link>

      <p className="mt-3 text-[12.5px] font-semibold uppercase tracking-wide text-evergreen">{article.category}</p>
      <h1 className="mt-1 text-2xl font-extrabold text-gray-900">{article.title}</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">{article.summary}</p>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <HelpBlocks blocks={article.blocks} />
      </div>

      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-gray-500">More in {article.category}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {related.map((a) => (
              <Link key={a.slug} href={`/help/${a.slug}`} className="rounded-xl border border-gray-200 bg-white px-5 py-3.5 transition-colors hover:border-gray-300">
                <p className="font-semibold text-gray-900">{a.title}</p>
                <p className="mt-1 text-[12.5px] leading-5 text-gray-600">{a.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
