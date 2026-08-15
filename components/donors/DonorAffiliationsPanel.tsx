'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Link2 } from 'lucide-react';
import { AffiliationType } from '@prisma/client';
import {
  saveDonorAffiliationAction,
  deleteDonorAffiliationAction,
  type ActionState,
} from '@/lib/actions/donor-affiliations';
import { AFFILIATION_TYPES, AFFILIATION_TYPE_LABELS } from '@/lib/affiliations';
import SubmitButton from '@/components/SubmitButton';

export type DonorAffiliationData = {
  id: string;
  affiliateName: string;
  affiliationType: AffiliationType | null;
  roleTitle: string | null;
  notes: string | null;
  affiliatedDonorId: string | null;
  affiliatedDonorName: string | null;
};

export default function DonorAffiliationsPanel({
  donorId,
  affiliations,
  donorOptions,
  canEdit,
}: {
  donorId: string;
  affiliations: DonorAffiliationData[];
  donorOptions: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<DonorAffiliationData | 'new' | null>(null);

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-gray-900" />
          <h2 className="text-[15px] font-bold text-gray-900">Affiliations</h2>
        </div>
        {canEdit && editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
          >
            <Plus size={14} />
            Add affiliation
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Organizations, employers, or other connections tied to this donor.
      </p>

      {editing !== null ? (
        <AffiliationForm
          donorId={donorId}
          affiliation={editing === 'new' ? undefined : editing}
          donorOptions={donorOptions}
          onDone={() => setEditing(null)}
        />
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-gray-50">
          {affiliations.length === 0 && (
            <p className="py-4 text-sm text-gray-600">
              No affiliations added yet — tag an employer, a family foundation, or another
              organization connected to this donor.
            </p>
          )}
          {affiliations.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {a.affiliatedDonorId ? (
                    <Link
                      href={`/donors/${a.affiliatedDonorId}`}
                      className="font-semibold text-evergreen hover:text-[#0d685f]"
                    >
                      {a.affiliateName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-gray-900">{a.affiliateName}</span>
                  )}
                  {a.affiliationType && (
                    <span className="rounded-full bg-sky/10 px-2.5 py-1 text-[11px] font-semibold text-sky">
                      {AFFILIATION_TYPE_LABELS[a.affiliationType]}
                    </span>
                  )}
                </div>
                {a.roleTitle && <div className="text-xs text-gray-600">{a.roleTitle}</div>}
                {a.notes && <p className="mt-1 text-xs text-gray-500">{a.notes}</p>}
              </div>
              {canEdit && (
                <div className="flex flex-shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(a)}
                    className="text-gray-400 hover:text-evergreen"
                    aria-label="Edit affiliation"
                  >
                    <Pencil size={14} />
                  </button>
                  <DeleteAffiliationButton donorId={donorId} affiliationId={a.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteAffiliationButton({
  donorId,
  affiliationId,
}: {
  donorId: string;
  affiliationId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Remove this affiliation?')) return;
    const formData = new FormData();
    formData.set('donorId', donorId);
    formData.set('id', affiliationId);
    startTransition(async () => {
      const result: ActionState = await deleteDonorAffiliationAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-gray-400 hover:text-error disabled:opacity-60"
      aria-label="Delete affiliation"
    >
      <Trash2 size={14} />
    </button>
  );
}

function AffiliationForm({
  donorId,
  affiliation,
  donorOptions,
  onDone,
}: {
  donorId: string;
  affiliation?: DonorAffiliationData;
  donorOptions: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveDonorAffiliationAction(undefined, formData);
      if (result?.error) setError(result.error);
      else onDone();
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1 block text-[12px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="donorId" value={donorId} />
      {affiliation?.id && <input type="hidden" name="id" value={affiliation.id} />}

      <div>
        <label className={labelClasses}>Affiliation name</label>
        <input
          name="affiliateName"
          required
          defaultValue={affiliation?.affiliateName}
          placeholder="Acme Corporation"
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClasses}>Type</label>
          <select
            name="affiliationType"
            defaultValue={affiliation?.affiliationType ?? ''}
            className={inputClasses}
          >
            <option value="">No type set</option>
            {AFFILIATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {AFFILIATION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClasses}>Role / title</label>
          <input
            name="roleTitle"
            defaultValue={affiliation?.roleTitle ?? ''}
            placeholder="Board Member"
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label className={labelClasses}>Link to an existing donor (optional)</label>
        <select
          name="affiliatedDonorId"
          defaultValue={affiliation?.affiliatedDonorId ?? ''}
          className={inputClasses}
        >
          <option value="">Not linked to another donor record</option>
          {donorOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-600">
          Only needed if the affiliated organization is itself already a donor here.
        </p>
      </div>

      <div>
        <label className={labelClasses}>Notes</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={affiliation?.notes ?? ''}
          className={inputClasses}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      <div className="mt-1 flex gap-2.5">
        <SubmitButton pending={isPending}>
          {affiliation ? 'Save changes' : 'Add affiliation'}
        </SubmitButton>
        <button
          type="button"
          onClick={onDone}
          disabled={isPending}
          className="rounded-xl border border-gray-200 px-5 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
