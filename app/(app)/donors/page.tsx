import Link from 'next/link';
import { Plus, Search, Upload } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role, RetentionRisk, DonorSegment } from '@prisma/client';
import DonorAvatar from '@/components/donors/DonorAvatar';
import { HealthScoreBadge, RetentionRiskBadge } from '@/components/donors/Badges';
import SegmentBadge from '@/components/donors/SegmentBadge';
import ViewScopeToggle from '@/components/shared/ViewScopeToggle';
import { resolveScope } from '@/lib/scope';
import { DONOR_SEGMENTS, SEGMENT_LABELS } from '@/lib/segments';
import { donorDisplayName, formatCurrency, formatDate } from '@/lib/format';

const PAGE_SIZE = 25;

const RISK_FILTERS = [
  RetentionRisk.LOW,
  RetentionRisk.MEDIUM,
  RetentionRisk.HIGH,
  RetentionRisk.CRITICAL,
];

export default async function DonorsPage({
  searchParams,
}: {
  searchParams: { q?: string; risk?: string; segment?: string; page?: string; scope?: string };
}) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);

  const q = searchParams.q?.trim() ?? '';
  const risk = searchParams.risk;
  const segment = searchParams.segment;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const scope = resolveScope(session!.user.role as Role, searchParams.scope);

  const where = {
    ...(scope === 'mine' ? { assignedToId: session!.user.id } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
            { organizationName: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(risk && RISK_FILTERS.includes(risk as RetentionRisk)
      ? { retentionRisk: risk as RetentionRisk }
      : {}),
    ...(segment && DONOR_SEGMENTS.includes(segment as DonorSegment)
      ? { segment: segment as DonorSegment }
      : {}),
  };

  const [donors, total] = await Promise.all([
    db.donor.findMany({
      where,
      orderBy: { lifetimeGiving: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { assignedTo: { select: { name: true, email: true } } },
    }),
    db.donor.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canCreate = permissions.canEditDonors(session!.user.role as Role);
  const canImport = permissions.canDeleteRecords(session!.user.role as Role);

  function buildHref(params: Record<string, string | undefined>) {
    const merged = { q, risk, segment, scope, page: String(page), ...params };
    const usp = new URLSearchParams();
    if (merged.q) usp.set('q', merged.q);
    if (merged.risk) usp.set('risk', merged.risk);
    if (merged.segment) usp.set('segment', merged.segment);
    if (merged.scope) usp.set('scope', merged.scope);
    if (merged.page && merged.page !== '1') usp.set('page', merged.page);
    const qs = usp.toString();
    return qs ? `/donors?${qs}` : '/donors';
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Donors</h1>
          <p className="mt-1 text-sm text-gray-600">
            {total} donor{total === 1 ? '' : 's'}
            {scope === 'mine' ? ' assigned to you' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {canImport && (
            <Link
              href="/donors/import"
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-[14px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
            >
              <Upload size={16} />
              Import CSV
            </Link>
          )}
          {canCreate && (
            <Link
              href="/donors/new"
              className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
            >
              <Plus size={16} />
              New Donor
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5">
        <ViewScopeToggle activeScope={scope} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form method="get" className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search donors…"
            className="w-64 rounded-[10px] border border-gray-200 py-2.5 pl-10 pr-3.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
        </form>

        <div className="flex gap-2">
          <Link
            href={buildHref({ risk: undefined, page: '1' })}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              !risk ? 'border-evergreen bg-evergreen/5 text-evergreen' : 'border-gray-200 text-gray-600'
            }`}
          >
            All
          </Link>
          {RISK_FILTERS.map((r) => (
            <Link
              key={r}
              href={buildHref({ risk: r, page: '1' })}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition-colors ${
                risk === r ? 'border-evergreen bg-evergreen/5 text-evergreen' : 'border-gray-200 text-gray-600'
              }`}
            >
              {r.toLowerCase()}
            </Link>
          ))}
        </div>

        <div className="flex gap-2">
          {DONOR_SEGMENTS.map((s) => (
            <Link
              key={s}
              href={buildHref({ segment: segment === s ? undefined : s, page: '1' })}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                segment === s ? 'border-sky bg-sky/5 text-sky' : 'border-gray-200 text-gray-600'
              }`}
            >
              {SEGMENT_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[16px] border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-5 py-3.5">Donor</th>
              <th className="px-5 py-3.5">Segment</th>
              <th className="px-5 py-3.5">Health</th>
              <th className="px-5 py-3.5">Risk</th>
              <th className="px-5 py-3.5">Lifetime giving</th>
              <th className="px-5 py-3.5">Assigned to</th>
              <th className="px-5 py-3.5">Last gift</th>
            </tr>
          </thead>
          <tbody>
            {donors.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-600">
                  No donors match your search.
                </td>
              </tr>
            )}
            {donors.map((donor) => {
              const name = donorDisplayName(donor);
              return (
                <tr key={donor.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <Link href={`/donors/${donor.id}`} className="flex items-center gap-3">
                      <DonorAvatar name={name} size={32} />
                      <div>
                        <div className="font-semibold text-gray-900">{name}</div>
                        {donor.email && <div className="text-xs text-gray-600">{donor.email}</div>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    {donor.segment ? <SegmentBadge segment={donor.segment} /> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <HealthScoreBadge score={donor.healthScore} />
                  </td>
                  <td className="px-5 py-3.5">
                    <RetentionRiskBadge risk={donor.retentionRisk} />
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {formatCurrency(donor.lifetimeGiving.toString())}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {donor.assignedTo?.name ?? donor.assignedTo?.email ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{formatDate(donor.lastGiftDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref({ page: String(p) })}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
                p === page ? 'bg-evergreen text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
