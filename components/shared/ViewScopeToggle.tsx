'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function ViewScopeToggle({
  activeScope,
  orgLabel = 'Whole Organization',
}: {
  /** The resolved scope for this request — computed server-side via resolveScope() so the role-aware default (Fundraisers → "mine", everyone else → "all") is respected even when the URL has no explicit ?scope=. */
  activeScope: 'mine' | 'all';
  orgLabel?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(newScope: 'mine' | 'all') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('scope', newScope);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
      <Link
        href={hrefFor('mine')}
        className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
          activeScope === 'mine' ? 'bg-evergreen text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        My View
      </Link>
      <Link
        href={hrefFor('all')}
        className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
          activeScope === 'all' ? 'bg-evergreen text-white' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {orgLabel}
      </Link>
    </div>
  );
}
