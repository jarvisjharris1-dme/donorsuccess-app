'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { navItems, isNavItemActive } from '@/lib/nav';
import Logo from './Logo';

export default function MobileNavDrawer({ hiddenHrefs = [] }: { hiddenHrefs?: string[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const hiddenSet = new Set(hiddenHrefs);
  const visibleItems = navItems.filter((item) => !hiddenSet.has(item.href));

  return (
    <>
      <button
        type="button"
        aria-label="Toggle menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 sm:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white px-4 py-6 shadow-lg">
            <div className="px-2">
              <Logo />
            </div>
            <nav className="mt-8 flex flex-1 flex-col gap-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      active ? 'bg-evergreen/10 text-evergreen' : 'text-gray-600'
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
