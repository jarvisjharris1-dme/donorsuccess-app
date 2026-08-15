'use client';

import { usePathname } from 'next/navigation';
import { currentNavLabel } from '@/lib/nav';

export default function PageHeaderTitle({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();

  return (
    <div>
      <h1 className="text-[15px] font-bold leading-tight text-gray-900">
        {currentNavLabel(pathname)}
      </h1>
      <p className="text-[12px] text-gray-600">{organizationName}</p>
    </div>
  );
}
