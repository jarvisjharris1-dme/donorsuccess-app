'use client';

import { useState, useTransition } from 'react';
import { updateComplianceAction, type ActionState } from '@/lib/actions/grantee-applications';

export default function ComplianceForm({
  applicationId,
  notOnWatchList,
  patriotActCompliant,
  notDebarred,
}: {
  applicationId: string;
  notOnWatchList: boolean;
  patriotActCompliant: boolean;
  notDebarred: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await updateComplianceAction(applicationId, formData);
      if (result?.error) setMessage(result.error);
      else if (result?.success) setMessage(result.success);
    });
  }

  const rowClasses = 'flex items-center gap-2 text-[13px] text-gray-900';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <label className={rowClasses}>
        <input type="checkbox" name="notOnWatchList" defaultChecked={notOnWatchList} />
        Not on any federal terrorism watch list
      </label>
      <label className={rowClasses}>
        <input type="checkbox" name="patriotActCompliant" defaultChecked={patriotActCompliant} />
        Patriot Act compliance certified
      </label>
      <label className={rowClasses}>
        <input type="checkbox" name="notDebarred" defaultChecked={notDebarred} />
        Not debarred or suspended from federal funding
      </label>
      {message && <p className="text-[12px] font-medium text-gray-600">{message}</p>}
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="mt-1 rounded-[8px] border border-gray-200 px-3.5 py-2 text-[12px] font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save certifications'}
        </button>
      </div>
    </form>
  );
}
