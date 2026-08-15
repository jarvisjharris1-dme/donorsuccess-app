'use client';

import { useState, useTransition } from 'react';
import { Route, Check, Clock } from 'lucide-react';
import {
  startSequenceAction,
  sendSequenceStepAction,
  endSequenceEarlyAction,
  type ActionState,
} from '@/lib/actions/sequence-enrollment';

export type SequenceStepView = {
  sortOrder: number;
  templateName: string;
  dayOffset: number;
  sentAt: string | null; // ISO string if already sent
};

export type ActiveEnrollmentView = {
  id: string;
  templateName: string;
  startedAt: string;
  currentStepOrder: number;
  steps: SequenceStepView[];
};

export type SuggestedSequence = {
  id: string;
  name: string;
  description: string | null;
  stepCount: number;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysFromNow(startedAtIso: string, dayOffset: number): { label: string; isOverdue: boolean } {
  const due = new Date(startedAtIso);
  due.setDate(due.getDate() + dayOffset);
  const diffDays = Math.round((due.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return { label: diffDays === 0 ? 'today' : `${Math.abs(diffDays)}d overdue`, isOverdue: true };
  return { label: formatDate(due.toISOString()), isOverdue: false };
}

export default function SuccessSequencePanel({
  donorId,
  activeEnrollment,
  suggestedSequences,
  allSequences,
  canManage,
}: {
  donorId: string;
  activeEnrollment: ActiveEnrollmentView | null;
  suggestedSequences: SuggestedSequence[];
  allSequences: SuggestedSequence[];
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPicker, setShowPicker] = useState(false);

  function handleStart(sequenceTemplateId: string) {
    const formData = new FormData();
    formData.set('donorId', donorId);
    formData.set('sequenceTemplateId', sequenceTemplateId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await startSequenceAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setShowPicker(false);
    });
  }

  function handleSendStep() {
    if (!activeEnrollment) return;
    const formData = new FormData();
    formData.set('enrollmentId', activeEnrollment.id);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await sendSequenceStepAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  function handleEndEarly() {
    if (!activeEnrollment) return;
    if (!confirm('End this sequence early? Remaining steps won\u2019t be sent.')) return;
    const formData = new FormData();
    formData.set('enrollmentId', activeEnrollment.id);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await endSequenceEarlyAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route size={16} className="text-gray-900" />
          <h2 className="text-[15px] font-bold text-gray-900">Success sequence</h2>
        </div>
        {activeEnrollment && (
          <span className="rounded-full bg-sky/10 px-2.5 py-1 text-[11px] font-semibold text-sky">Active</span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">{error}</p>
      )}

      {activeEnrollment ? (
        <>
          <p className="mt-1 text-[13px] text-gray-600">
            {activeEnrollment.templateName} &middot; started {formatDate(activeEnrollment.startedAt)}
          </p>

          <div className="mt-4 flex flex-col">
            {activeEnrollment.steps.map((step) => {
              const isSent = step.sentAt !== null;
              const isCurrent = !isSent && step.sortOrder === activeEnrollment.currentStepOrder;
              const due = !isSent ? daysFromNow(activeEnrollment.startedAt, step.dayOffset) : null;

              return (
                <div
                  key={step.sortOrder}
                  className={`flex items-start gap-3 border-b border-gray-50 py-2.5 last:border-0 ${
                    isCurrent ? '-mx-6 bg-warning/5 px-6' : ''
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full ${
                      isSent ? 'bg-success' : isCurrent ? 'bg-warning' : 'border border-gray-300'
                    }`}
                  >
                    {isSent && <Check size={13} className="text-white" />}
                    {isCurrent && <Clock size={13} className="text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[14px] ${isSent ? '' : isCurrent ? '' : 'text-gray-500'}`}>
                      {step.templateName}
                    </p>
                    <p className={`mt-0.5 text-xs ${isCurrent ? 'font-semibold text-warning' : 'text-gray-500'}`}>
                      {isSent
                        ? `Sent ${formatDate(step.sentAt!)}`
                        : isCurrent
                          ? `Due ${due!.label} — day ${step.dayOffset}`
                          : `Upcoming — day ${step.dayOffset}`}
                    </p>
                  </div>
                  {isCurrent && canManage && (
                    <button
                      type="button"
                      onClick={handleSendStep}
                      disabled={isPending}
                      className="flex-shrink-0 rounded-lg bg-evergreen px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d685f] disabled:opacity-60"
                    >
                      {isPending ? 'Sending…' : 'Send'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canManage && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={handleEndEarly}
                disabled={isPending}
                className="text-[12.5px] text-gray-500 hover:text-gray-700 disabled:opacity-60"
              >
                End sequence early
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {suggestedSequences.length > 0 && !showPicker && (
            <div className="mt-3 flex flex-col gap-2">
              {suggestedSequences.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-warning/5 px-4 py-3"
                >
                  <div>
                    <p className="text-[13.5px] font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-600">
                      Suggested for this donor&rsquo;s risk tier &middot; {s.stepCount} steps
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleStart(s.id)}
                      disabled={isPending}
                      className="flex-shrink-0 rounded-lg bg-evergreen px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d685f] disabled:opacity-60"
                    >
                      Start
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canManage && !showPicker && (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="mt-3 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
            >
              Start a different sequence
            </button>
          )}

          {canManage && showPicker && (
            <div className="mt-3 flex flex-col gap-2">
              {allSequences.length === 0 && (
                <p className="text-sm text-gray-600">
                  No sequences set up yet — build one in Settings first.
                </p>
              )}
              {allSequences.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleStart(s.id)}
                  disabled={isPending}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition-colors hover:border-gray-300 disabled:opacity-60"
                >
                  <div>
                    <p className="text-[13.5px] font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-600">{s.stepCount} steps</p>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="self-start text-[12.5px] text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}

          {suggestedSequences.length === 0 && !showPicker && (
            <p className="mt-3 text-sm text-gray-600">No active sequence for this donor.</p>
          )}
        </>
      )}
    </div>
  );
}
