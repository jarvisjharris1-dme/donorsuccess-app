'use client';

import type { ImportField } from '@/lib/import/shared';

export type IdentityPath = { keys: string[]; label: string };

export default function MapStep({
  fields,
  requiredFields,
  identityPaths,
  identityNote,
  headers,
  rows,
  mapping,
  onChange,
  onBack,
  onContinue,
}: {
  fields: ImportField[];
  requiredFields: ImportField[];
  /** Optional either/or requirement — e.g. donor import's "name OR org name". Omit for a flat required-fields check. */
  identityPaths?: IdentityPath[];
  /** Custom copy for the identity-paths callout box. Only shown if identityPaths is provided. */
  identityNote?: string;
  headers: string[];
  rows: Record<string, string>[];
  mapping: Record<string, string | null>;
  onChange: (fieldKey: string, header: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const previewRows = rows.slice(0, 5);
  const missingRequired = requiredFields.filter((f) => !mapping[f.key]);
  const identitySatisfied =
    !identityPaths || identityPaths.some((path) => path.keys.every((k) => mapping[k]));
  const canContinue = missingRequired.length === 0 && identitySatisfied;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Match your columns</h2>
        <p className="mt-1 text-sm text-gray-600">
          We&rsquo;ve guessed a few based on common column names — double check them, and map
          anything we missed. Everything not marked required can be left as
          &ldquo;Don&rsquo;t import&rdquo; and is simply skipped.
        </p>

        {identityPaths && identityNote && (
          <div className="mt-4 rounded-lg bg-sky/10 px-3.5 py-3">
            <p className="text-sm font-medium text-gray-900">{identityNote}</p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-[12.5px] font-semibold text-gray-900">
                {field.label}
                {field.required && <span className="text-error"> *</span>}
              </label>
              <select
                value={mapping[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value || null)}
                className={`w-full rounded-[10px] border px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 ${
                  field.required && !mapping[field.key] ? 'border-error/40' : 'border-gray-200'
                }`}
              >
                <option value="">Don&rsquo;t import</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {(!identitySatisfied || missingRequired.length > 0) && (
          <div className="mt-4 flex flex-col gap-1.5 rounded-lg bg-warning/10 px-3.5 py-2.5">
            {!identitySatisfied && identityPaths && (
              <p className="text-sm font-medium text-warning">
                Map {identityPaths.map((p) => p.label).join(', or ')} before you can continue.
              </p>
            )}
            {missingRequired.length > 0 && (
              <p className="text-sm font-medium text-warning">
                Map a column for: {missingRequired.map((f) => f.label).join(', ')} — always
                required.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-[16px] border border-gray-200 bg-white p-6">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Preview (first {previewRows.length} rows)
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                {fields.filter((f) => mapping[f.key]).map((f) => (
                  <th key={f.key} className="whitespace-nowrap px-3 py-2">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  {fields.filter((f) => mapping[f.key]).map((f) => (
                    <td key={f.key} className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {mapping[f.key] ? row[mapping[f.key] as string] || '—' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="rounded-xl bg-evergreen px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to review
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-gray-200 px-6 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300"
        >
          Back
        </button>
      </div>
    </div>
  );
}
