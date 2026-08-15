'use client';

import { useState, useTransition } from 'react';
import { Paperclip, Upload, Trash2, Download } from 'lucide-react';
import {
  uploadGrantDocumentAction,
  deleteGrantDocumentAction,
  type ActionState,
} from '@/lib/actions/grant-documents';

export type DocumentRow = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedByName: string;
  attachedToLabel: string | null;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GrantDocumentsPanel({
  grantOpportunityId,
  documents,
  attachOptions,
  canEdit,
}: {
  grantOpportunityId: string;
  documents: DocumentRow[];
  attachOptions: { value: string; label: string }[];
  canEdit: boolean;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('grantOpportunityId', grantOpportunityId);

    const attachTo = formData.get('attachTo');
    formData.delete('attachTo');
    if (typeof attachTo === 'string' && attachTo) {
      const [kind, id] = attachTo.split(':');
      if (kind === 'requirement') formData.set('requirementId', id);
      if (kind === 'milestone') formData.set('milestoneId', id);
    }

    setError(null);
    startTransition(async () => {
      const result: ActionState = await uploadGrantDocumentAction(undefined, formData);
      if (result?.error) setError(result.error);
      else {
        setShowUpload(false);
        (document.getElementById('grant-document-upload-form') as HTMLFormElement | null)?.reset();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this document?')) return;
    const formData = new FormData();
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    startTransition(async () => {
      const result: ActionState = await deleteGrantDocumentAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-gray-900" />
          <h2 className="text-[15px] font-bold text-gray-900">Documents</h2>
        </div>
        {canEdit && !showUpload && (
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
          >
            <Upload size={14} />
            Upload
          </button>
        )}
      </div>

      {showUpload && (
        <form
          id="grant-document-upload-form"
          onSubmit={handleUpload}
          className="mt-3 flex flex-col gap-2.5 rounded-xl bg-gray-50 p-4"
        >
          <input
            name="file"
            type="file"
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          {attachOptions.length > 0 && (
            <select
              name="attachTo"
              defaultValue=""
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">General document (not tied to a specific item)</option>
              {attachOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500">4MB max per file.</p>
          {error && <p className="text-xs font-medium text-error">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {isPending ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-3 flex flex-col divide-y divide-gray-50">
        {documents.length === 0 && !showUpload && (
          <p className="py-3 text-sm text-gray-600">No documents attached yet.</p>
        )}
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-gray-900">{d.fileName}</p>
              <p className="text-xs text-gray-500">
                {d.attachedToLabel ? `${d.attachedToLabel} · ` : ''}
                {formatFileSize(d.fileSize)} · uploaded by {d.uploadedByName}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <a
                href={`/api/grants/documents/${d.id}/download`}
                className="text-gray-400 hover:text-evergreen"
                aria-label="Download"
              >
                <Download size={15} />
              </a>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="text-gray-400 hover:text-error"
                  aria-label="Remove document"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
