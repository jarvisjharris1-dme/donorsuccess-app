'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ImportField, ImportResult } from '@/lib/import/shared';
import type { IdentityPath } from './MapStep';

export type { ImportResult } from '@/lib/import/shared';

export default function ReviewStep({
  requiredFields,
  identityPaths,
  rows,
  mapping,
  duplicateNote,
  importAction,
  onBack,
  onDone,
}: {
  requiredFields: ImportField[];
  identityPaths?: IdentityPath[];
  rows: Record<string, string>[];
  mapping: Record<string, string | null>;
  /** Copy explaining what counts as a duplicate for this import type. */
  duplicateNote: string;
  importAction: (
    rows: Record<string, string>[],
    mapping: Record<string, string | null>,
  ) => Promise<ImportResult>;
  onBack: () => void;
  onDone: (result: ImportResult) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Client-side estimate only — the server action re-validates every
  // row for real (including whether amounts/dates actually parse), this
  // is just to set expectations before committing.
  const readyEstimate = useMemo(() => {
    const requiredHeaders = requiredFields.map((f) => mapping[f.key]).filter(Boolean) as string[];

    const rowHasIdentity = (row: Record<string, string>) =>
      !identityPaths ||
      identityPaths.some((path) =>
        path.keys.every((k) => {
          const header = mapping[k];
          return header && row[header]?.trim();
        }),
      );

    const ready = rows.filter(
      (r) => requiredHeaders.every((h) => r[h]?.trim()) && rowHasIdentity(r),
    ).length;
    return { ready, missing: rows.length - ready };
  }, [rows, mapping, requiredFields, identityPaths]);

  function handleImport() {
    setError(null);
    startTransition(async () => {
      const result = await importAction(rows, mapping);
      if (result.error) setError(result.error);
      else onDone(result);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Ready to import</h2>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-[12px] bg-gray-50 p-4">
            <div className="text-2xl font-extrabold text-gray-900">{rows.length}</div>
            <div className="mt-0.5 text-xs font-medium text-gray-600">Total rows in file</div>
          </div>
          <div className="rounded-[12px] bg-success/10 p-4">
            <div className="text-2xl font-extrabold text-success">{readyEstimate.ready}</div>
            <div className="mt-0.5 text-xs font-medium text-gray-600">Look ready to import</div>
          </div>
        </div>

        {readyEstimate.missing > 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-warning/10 px-3.5 py-2.5">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-warning" />
            <p className="text-sm font-medium text-warning">
              {readyEstimate.missing} row{readyEstimate.missing === 1 ? '' : 's'} appear to be
              missing a required field — they&rsquo;ll be skipped and listed after import (with
              which field was missing) so you can fix and re-import just those.
            </p>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-600">{duplicateNote}</p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleImport}
          disabled={isPending}
          className="rounded-xl bg-evergreen px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Importing…' : `Import ${rows.length} row${rows.length === 1 ? '' : 's'}`}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="rounded-xl border border-gray-200 px-6 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300 disabled:opacity-60"
        >
          Back
        </button>
      </div>
    </div>
  );
}
