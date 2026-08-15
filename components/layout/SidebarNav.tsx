'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems, isNavItemActive } from '@/lib/nav';

export default function SidebarNav({ hiddenHrefs = [] }: { hiddenHrefs?: string[] }) {
  const pathname = usePathname();
  const hiddenSet = new Set(hiddenHrefs);
  const visibleItems = navItems.filter((item) => !hiddenSet.has(item.href));

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? 'bg-evergreen/10 text-evergreen' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] transition-colors ${
                active ? 'bg-evergreen text-white' : 'text-gray-400 group-hover:text-gray-600'
              }`}
            >
              <Icon size={15} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
