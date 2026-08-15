import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export type RiskCounts = {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
  UNSCORED: number;
};

const TIERS: { key: keyof RiskCounts; label: string; bar: string; dot: string }[] = [
  { key: 'LOW', label: 'Low risk', bar: 'bg-success', dot: 'bg-success' },
  { key: 'MEDIUM', label: 'Medium risk', bar: 'bg-warning', dot: 'bg-warning' },
  { key: 'HIGH', label: 'High risk', bar: 'bg-[#F97316]', dot: 'bg-[#F97316]' },
  { key: 'CRITICAL', label: 'Critical risk', bar: 'bg-error', dot: 'bg-error' },
  { key: 'UNSCORED', label: 'Not yet scored', bar: 'bg-gray-200', dot: 'bg-gray-300' },
];

export default function RiskOverview({ counts }: { counts: RiskCounts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="fade-up rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">Donor health overview</h2>
          <p className="mt-0.5 text-[13px] text-gray-600">
            {total} donor{total === 1 ? '' : 's'} across every retention risk tier
          </p>
        </div>
        <Link
          href="/donors"
          className="flex items-center gap-1 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
        >
          View donors
          <ArrowRight size={14} />
        </Link>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-sm text-gray-600">
          No donors yet — <Link href="/donors/new" className="font-semibold text-evergreen">add your first one</Link> to
          start tracking health scores.
        </p>
      ) : (
        <>
          <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
            {TIERS.map((tier) =>
              counts[tier.key] > 0 ? (
                <div
                  key={tier.key}
                  className={`${tier.bar} h-full transition-all`}
                  style={{ width: `${(counts[tier.key] / total) * 100}%` }}
                  title={`${tier.label}: ${counts[tier.key]}`}
                />
              ) : null,
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {TIERS.map((tier) => (
              <div key={tier.key} className="flex items-center gap-2">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${tier.dot}`} />
                <div>
                  <div className="text-[13px] font-bold text-gray-900">{counts[tier.key]}</div>
                  <div className="text-[11px] text-gray-600">{tier.label}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
