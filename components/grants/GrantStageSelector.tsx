'use client';

import { useState, useTransition } from 'react';
import { GrantStage } from '@prisma/client';
import { GRANT_STAGES, GRANT_STAGE_LABELS, GRANT_STAGE_STYLES } from '@/lib/grants';
import { updateGrantStageAction, type ActionState } from '@/lib/actions/grants';

export default function GrantStageSelector({
  grantId,
  currentStage,
  canEdit,
}: {
  grantId: string;
  currentStage: GrantStage;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showDeclineReason, setShowDeclineReason] = useState(false);

  function handleChange(stage: GrantStage) {
    if (stage === GrantStage.DECLINED) {
      setShowDeclineReason(true);
      return;
    }
    submit(stage);
  }

  function submit(stage: GrantStage, declineReason?: string) {
    const formData = new FormData();
    formData.set('id', grantId);
    formData.set('stage', stage);
    if (declineReason) formData.set('declineReason', declineReason);
    startTransition(async () => {
      const result: ActionState = await updateGrantStageAction(undefined, formData);
      if (result?.error) alert(result.error);
      setShowDeclineReason(false);
    });
  }

  if (!canEdit) {
    return (
      <span className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${GRANT_STAGE_STYLES[currentStage]}`}>
        {GRANT_STAGE_LABELS[currentStage]}
      </span>
    );
  }

  return (
    <div>
      <select
        value={currentStage}
        onChange={(e) => handleChange(e.target.value as GrantStage)}
        disabled={isPending}
        className={`rounded-full border-0 px-3 py-1.5 text-[13px] font-semibold ${GRANT_STAGE_STYLES[currentStage]}`}
      >
        {GRANT_STAGES.map((s) => (
          <option key={s} value={s}>
            {GRANT_STAGE_LABELS[s]}
          </option>
        ))}
      </select>

      {showDeclineReason && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <input
            type="text"
            placeholder="Reason (optional)"
            id="decline-reason-input"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                submit(
                  GrantStage.DECLINED,
                  (document.getElementById('decline-reason-input') as HTMLInputElement)?.value,
                )
              }
              className="rounded-lg bg-evergreen px-3 py-1.5 text-[12.5px] font-semibold text-white"
            >
              Confirm decline
            </button>
            <button
              type="button"
              onClick={() => setShowDeclineReason(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
