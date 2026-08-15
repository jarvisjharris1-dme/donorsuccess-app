const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'map', label: 'Map columns' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
] as const;

export type WizardStep = (typeof STEPS)[number]['key'];

export default function StepIndicator({ current }: { current: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isDone
                    ? 'bg-evergreen text-white'
                    : isCurrent
                      ? 'border-2 border-evergreen text-evergreen'
                      : 'border-2 border-gray-200 text-gray-400'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-[13px] font-semibold ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="mx-3 h-px w-8 bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}
