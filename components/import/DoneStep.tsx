'use client';

import Link from 'next/link';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { ImportResult } from '@/lib/import/shared';

export default function DoneStep({
  result,
  itemLabel = 'donor',
  nextStepNote,
  onImportAnother,
}: {
  result: ImportResult;
  /** Singular noun for what was created — "donor" or "gift". */
  itemLabel?: string;
  /** Optional callout shown below the count, e.g. pointing at Settings to recalculate scores. */
  nextStepNote?: React.ReactNode;
  onImportAnother: () => void;
}) {
  const skipped = result.skipped ?? [];
  const created = result.created ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[16px] border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={20} className="text-success" />
          <h2 className="text-[15px] font-bold text-gray-900">Import complete</h2>
        </div>
        <p className="mt-2 text-2xl font-extrabold text-gray-900">
          {created} {itemLabel}
          {created === 1 ? '' : 's'} added
        </p>

        {nextStepNote && (
          <div className="mt-5 rounded-lg bg-sky/10 px-3.5 py-3">
            <p className="text-sm text-gray-900">{nextStepNote}</p>
          </div>
        )}
      </div>

      {skipped.length > 0 && (
        <div className="rounded-[16px] border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-warning" />
            <h3 className="text-[15px] font-bold text-gray-900">
              {skipped.length} row{skipped.length === 1 ? '' : 's'} skipped
            </h3>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {skipped.map((s) => (
                  <tr key={s.row} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-gray-600">{s.row}</td>
                    <td className="px-3 py-2 text-gray-900">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/donors"
          className="rounded-xl bg-evergreen px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
        >
          View donors
        </Link>
        <button
          type="button"
          onClick={onImportAnother}
          className="rounded-xl border border-gray-200 px-6 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300"
        >
          Import another file
        </button>
      </div>
    </div>
  );
}
