import Link from 'next/link';
import { Gift as GiftIcon, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';

export type RecentGift = {
  id: string;
  donorId: string;
  donorName: string;
  amount: string;
  date: string;
};

export default function RecentGiftsPanel({ gifts }: { gifts: RecentGift[] }) {
  return (
    <div className="fade-up rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-900">
          <GiftIcon size={16} />
          <h2 className="text-[15px] font-bold">Recent gifts</h2>
        </div>
        <Link
          href="/donors"
          className="flex items-center gap-1 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
        >
          View donors
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {gifts.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-600">No gifts logged yet.</p>
        )}
        {gifts.map((g) => (
          <Link
            key={g.id}
            href={`/donors/${g.donorId}`}
            className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-evergreen"
          >
            <span className="truncate text-sm font-medium text-gray-900">{g.donorName}</span>
            <div className="flex flex-shrink-0 items-center gap-3">
              <span className="text-sm font-bold text-gray-900">{formatCurrency(g.amount)}</span>
              <span className="text-xs font-medium text-gray-600">{formatDate(g.date)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
