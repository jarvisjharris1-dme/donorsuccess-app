export default function ProgressBar({ raised, goal }: { raised: number; goal: number | null }) {
  const pct = goal && goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : null;

  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal to-evergreen transition-all"
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
      {pct !== null && (
        <div className="mt-1.5 text-xs font-semibold text-gray-600">{pct}% of goal</div>
      )}
    </div>
  );
}
