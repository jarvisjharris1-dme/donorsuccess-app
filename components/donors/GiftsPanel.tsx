'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import GiftForm from './GiftForm';
import { formatCurrency, formatDate } from '@/lib/format';

export type GiftRow = {
  id: string;
  amount: string;
  date: string;
  giftType: string;
  paymentMethod: string;
  fund: string | null;
  campaignName?: string | null;
};

export default function GiftsPanel({
  donorId,
  gifts,
  campaigns,
}: {
  donorId: string;
  gifts: GiftRow[];
  campaigns: { id: string; name: string }[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-gray-900">Gifts</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen"
        >
          <Plus size={15} />
          {showForm ? 'Cancel' : 'Log a gift'}
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <GiftForm donorId={donorId} campaigns={campaigns} onDone={() => setShowForm(false)} />
        </div>
      )}

      <div className="mt-4 divide-y divide-gray-100">
        {gifts.length === 0 && (
          <p className="py-4 text-sm text-gray-600">No gifts recorded yet.</p>
        )}
        {gifts.map((g) => (
          <div key={g.id} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrency(g.amount)}
              </div>
              <div className="text-xs text-gray-600">
                {g.fund ?? 'General fund'} &middot;{' '}
                {g.paymentMethod.replace('_', ' ').toLowerCase()}
                {g.campaignName && <> &middot; {g.campaignName}</>}
              </div>
            </div>
            <div className="text-xs font-medium text-gray-600">{formatDate(g.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
