'use client';

import { useState, useTransition } from 'react';
import { saveEvaluationAction, type ActionState } from '@/lib/actions/evaluations';

export default function EvaluationForm({
  applicationId,
  criteria,
  initialScores,
  initialComment,
}: {
  applicationId: string;
  criteria: string[];
  initialScores?: number[];
  initialComment?: string | null;
}) {
  const [scores, setScores] = useState<number[]>(initialScores ?? criteria.map(() => 0));
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = scores.reduce((a, b) => a + b, 0);
  const max = criteria.length * 5;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result: ActionState = await saveEvaluationAction(undefined, formData);
      if (result?.error) setMessage({ type: 'error', text: result.error });
      else if (result?.success) setMessage({ type: 'success', text: result.success });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="applicationId" value={applicationId} />

      {criteria.map((label, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[13px] text-gray-900">{label}</span>
            <span className="text-[13px] font-semibold text-gray-900">{scores[i]} / 5</span>
          </div>
          <input
            type="range"
            name="scores"
            min={0}
            max={5}
            step={1}
            value={scores[i]}
            onChange={(e) => {
              const next = [...scores];
              next[i] = Number(e.target.value);
              setScores(next);
            }}
            className="w-full"
          />
        </div>
      ))}

      <div>
        <label htmlFor="comment" className="mb-1.5 block text-[13px] font-semibold text-gray-900">
          Comments
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          defaultValue={initialComment ?? ''}
          placeholder="What stands out about this application"
          className="w-full rounded-[10px] border border-gray-200 px-3.5 py-3 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        />
      </div>

      {message && (
        <p
          className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
            message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-success/10 text-success'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-600">
          Your total <span className="font-semibold text-gray-900">{total}</span> / {max}
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Submitting…' : 'Submit evaluation'}
        </button>
      </div>
    </form>
  );
}
