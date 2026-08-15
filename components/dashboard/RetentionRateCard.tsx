import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function colorFor(rate: number): { stroke: string; text: string } {
  if (rate >= 50) return { stroke: '#22C55E', text: 'text-success' };
  if (rate >= 35) return { stroke: '#F59E0B', text: 'text-warning' };
  return { stroke: '#EF4444', text: 'text-error' };
}

export default function RetentionRateCard({
  rate,
  priorPeriodDonors,
  retainedDonors,
}: {
  rate: number | null;
  priorPeriodDonors: number;
  retainedDonors: number;
}) {
  if (rate === null) {
    return (
      <div className="fade-up flex flex-col justify-center rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Donor retention rate</h2>
        <p className="mt-2 max-w-md text-sm text-gray-600">
          Not enough giving history yet — retention compares donors from 12–24 months ago
          against the last 12 months. Check back once you have a year of gifts on the books.
        </p>
      </div>
    );
  }

  const { stroke, text } = colorFor(rate);
  const offset = CIRCUMFERENCE * (1 - rate / 100);
  const benchmarkNote =
    rate >= 50
      ? 'Above the nonprofit sector average (~45%)'
      : rate >= 35
        ? 'Around the nonprofit sector average (~45%)'
        : 'Below the nonprofit sector average (~45%)';

  return (
    <div className="fade-up rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-gray-900">Donor retention rate</h2>
        <Link
          href="/donors"
          className="flex items-center gap-1 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
        >
          View donors
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-6">
        <svg width="104" height="104" viewBox="0 0 104 104" className="flex-shrink-0 -rotate-90">
          <circle cx="52" cy="52" r={RADIUS} fill="none" stroke="#F1F5F9" strokeWidth="10" />
          <circle
            cx="52"
            cy="52"
            r={RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
          <text
            x="52"
            y="52"
            textAnchor="middle"
            dominantBaseline="central"
            transform="rotate(90 52 52)"
            className={`font-display text-[22px] font-extrabold ${text}`}
            fill="currentColor"
          >
            {rate}%
          </text>
        </svg>

        <div>
          <p className="text-sm text-gray-900">
            <span className="font-bold">{retainedDonors}</span> of{' '}
            <span className="font-bold">{priorPeriodDonors}</span> donors from last year gave
            again this year
          </p>
          <p className={`mt-1.5 text-[13px] font-medium ${text}`}>{benchmarkNote}</p>
        </div>
      </div>
    </div>
  );
}
