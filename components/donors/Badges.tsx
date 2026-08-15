const RISK_STYLES: Record<string, string> = {
  LOW: 'bg-success/10 text-success',
  MEDIUM: 'bg-warning/10 text-warning',
  HIGH: 'bg-error/10 text-error',
  CRITICAL: 'bg-error/15 text-error',
};

export function RetentionRiskBadge({ risk }: { risk: string | null | undefined }) {
  if (!risk) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
        Unscored
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${RISK_STYLES[risk] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {risk.toLowerCase()} risk
    </span>
  );
}

export function HealthScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
        Not yet scored
      </span>
    );
  }

  const color = score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-error';

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-bold ${color}`}>
      {score}
      <span className="text-xs font-medium text-gray-600">/100</span>
    </span>
  );
}
