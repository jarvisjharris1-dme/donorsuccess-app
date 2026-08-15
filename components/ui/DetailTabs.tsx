'use client';

import { useState, type ReactNode } from 'react';

export type DetailTab = {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
};

export default function DetailTabs({ tabs, defaultTab }: { tabs: DetailTab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((t) => {
          const isActive = t.key === activeTab?.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[14px] font-semibold transition-colors ${
                isActive
                  ? 'border-evergreen text-evergreen'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isActive ? 'bg-teal/10 text-evergreen' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-6">{activeTab?.content}</div>
    </div>
  );
}
