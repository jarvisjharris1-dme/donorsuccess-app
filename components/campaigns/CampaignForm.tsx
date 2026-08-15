'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CampaignStatus, CampaignChannel } from '@prisma/client';
import SubmitButton from '@/components/SubmitButton';
import { CAMPAIGN_STATUSES, STATUS_LABELS, CHANNEL_LABELS } from '@/lib/campaigns';
import { toDateInputValue } from '@/lib/format';
import { saveCampaignAction, type ActionState } from '@/lib/actions/campaigns';

type CampaignFormValues = {
  id?: string;
  name: string;
  description?: string | null;
  goalAmount?: number | string | null;
  status: CampaignStatus;
  channel: CampaignChannel;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  parentCampaignId?: string | null;
  visibleToAll?: boolean;
  assignedFundraiserIds?: string[];
};

export default function CampaignForm({
  campaign,
  parentCampaignOptions,
  fundraisers,
}: {
  campaign?: CampaignFormValues;
  /** Top-level campaigns only (no parent of their own) — keeps the hierarchy one level deep, and excludes the campaign itself when editing. */
  parentCampaignOptions: { id: string; name: string }[];
  fundraisers: { id: string; name: string | null; email: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [visibleToAll, setVisibleToAll] = useState(campaign?.visibleToAll ?? true);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await saveCampaignAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputClasses =
    'w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
  const labelClasses = 'mb-1.5 block text-[13px] font-semibold text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {campaign?.id && <input type="hidden" name="id" value={campaign.id} />}

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Campaign
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="name" className={labelClasses}>
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={campaign?.name ?? ''}
              placeholder="e.g. 2026 Spring Appeal"
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="description" className={labelClasses}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={campaign?.description ?? ''}
              className={`${inputClasses} resize-y`}
            />
          </div>
          <div>
            <label htmlFor="parentCampaignId" className={labelClasses}>
              Parent campaign
            </label>
            <select
              id="parentCampaignId"
              name="parentCampaignId"
              defaultValue={campaign?.parentCampaignId ?? ''}
              className={inputClasses}
            >
              <option value="">No parent — this is a top-level campaign</option>
              {parentCampaignOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-600">
              Optional — nest this as a sub-type underneath a main campaign (e.g. &ldquo;Direct Mail
              Appeal&rdquo; under &ldquo;2026 Annual Fund&rdquo;).
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Goal &amp; timing
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="goalAmount" className={labelClasses}>
              Goal amount
            </label>
            <input
              id="goalAmount"
              name="goalAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={campaign?.goalAmount?.toString() ?? ''}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="channel" className={labelClasses}>
              Channel
            </label>
            <select
              id="channel"
              name="channel"
              defaultValue={campaign?.channel ?? CampaignChannel.EMAIL}
              className={inputClasses}
            >
              {Object.values(CampaignChannel).map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className={labelClasses}>
              Start date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={toDateInputValue(campaign?.startDate)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="endDate" className={labelClasses}>
              End date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={toDateInputValue(campaign?.endDate)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="status" className={labelClasses}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={campaign?.status ?? CampaignStatus.PLANNING}
              className={inputClasses}
            >
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-gray-200 p-5">
        <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-gray-600">
          Visibility
        </h3>
        <label className="flex items-center gap-2.5 text-sm font-medium text-gray-900">
          <input
            type="checkbox"
            name="visibleToAll"
            checked={visibleToAll}
            onChange={(e) => setVisibleToAll(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-evergreen focus:ring-teal"
          />
          Visible to the entire organization
        </label>
        <p className="mt-1.5 text-xs text-gray-600">
          Uncheck to restrict this campaign to specific fundraisers only — useful for something
          like a major-gifts-only push that shouldn&apos;t clutter everyone else&apos;s view.
        </p>

        {!visibleToAll && (
          <div className="mt-4">
            <label className={labelClasses}>Assigned fundraisers</label>
            <select
              name="assignedFundraiserIds"
              multiple
              defaultValue={campaign?.assignedFundraiserIds ?? []}
              className={`${inputClasses} h-32`}
            >
              {fundraisers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name ?? f.email}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-600">
              Cmd/Ctrl-click (or shift-click) to select more than one.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton pending={isPending}>
          {campaign?.id ? 'Save changes' : 'Create campaign'}
        </SubmitButton>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-gray-200 px-6 py-3.5 text-[15px] font-semibold text-gray-600 transition-colors hover:border-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
