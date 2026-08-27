'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { uploadCommunityLogoAction, removeCommunityLogoAction } from '@/lib/actions/community-branding';

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-evergreen px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
    >
      {pending ? 'Uploading…' : 'Upload logo'}
    </button>
  );
}

export default function CommunityBrandingForm({ logoUrl, organizationName }: { logoUrl: string | null; organizationName: string }) {
  const [state, formAction] = useFormState(uploadCommunityLogoAction, undefined);

  return (
    <div>
      <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">
        {logoUrl ? (
          // External customer logos come from the organization's Vercel Blob URL, so a plain img avoids remote-image host configuration.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`${organizationName} logo`} className="max-h-20 max-w-[280px] object-contain" />
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">No funding organization logo uploaded yet.</p>
            <p className="mt-1 text-xs text-gray-500">Your organization name will appear as the fallback.</p>
          </div>
        )}
      </div>

      <form action={formAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-semibold text-gray-900">Organization logo</label>
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            required
            className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">PNG, JPG, WebP, GIF, or SVG · maximum 5 MB.</p>
        </div>
        <UploadButton />
      </form>

      {state?.error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{state.error}</p>}
      {state?.success && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{state.success}</p>}

      {logoUrl && (
        <form action={removeCommunityLogoAction} className="mt-4">
          <button type="submit" className="text-sm font-semibold text-red-600 hover:text-red-700">Remove current logo</button>
        </form>
      )}
    </div>
  );
}
