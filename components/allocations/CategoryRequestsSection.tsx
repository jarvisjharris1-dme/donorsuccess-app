'use client';

import { useState } from 'react';
import CategoryRequestForm, { type CategoryRequestValues } from './CategoryRequestForm';
import { formatCurrency } from '@/lib/format';

export default function CategoryRequestsSection({
  applicationId,
  categories,
  requests,
  canEdit,
}: {
  applicationId: string;
  categories: string[];
  requests: CategoryRequestValues[];
  canEdit: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const usedCategories = new Set(requests.filter((r) => r.id !== editingId).map((r) => r.category));
  const availableForNew = categories.filter((c) => !usedCategories.has(c));

  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) =>
        editingId === r.id ? (
          <CategoryRequestForm
            key={r.id}
            applicationId={applicationId}
            availableCategories={categories}
            request={r}
            onDone={() => setEditingId(null)}
          />
        ) : (
          <div key={r.id} className="rounded-[12px] border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-gray-900">{r.category}</p>
              <div className="flex items-center gap-3">
                <p className="text-[14px] font-semibold text-gray-900">{formatCurrency(r.requestedAmount)}</p>
                {canEdit && (
                  <button
                    onClick={() => setEditingId(r.id!)}
                    className="text-[12px] font-semibold text-evergreen hover:text-[#0d685f]"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            {r.targetPopulation && <p className="mt-1.5 text-[13px] text-gray-600">{r.targetPopulation}</p>}
          </div>
        ),
      )}

      {requests.length === 0 && (
        <p className="rounded-[12px] border border-dashed border-gray-200 p-4 text-center text-[13px] text-gray-600">
          No service categories requested yet.
        </p>
      )}

      {canEdit && adding && (
        <CategoryRequestForm
          applicationId={applicationId}
          availableCategories={availableForNew}
          onDone={() => setAdding(false)}
        />
      )}

      {canEdit && !adding && availableForNew.length > 0 && (
        <button
          onClick={() => setAdding(true)}
          className="rounded-[10px] border border-dashed border-gray-300 py-2.5 text-[13px] font-semibold text-gray-600 hover:border-gray-400 hover:text-gray-900"
        >
          + Add category request
        </button>
      )}
    </div>
  );
}
