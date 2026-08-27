import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import { FUNDING_ROUND_STATUS_LABELS, FUNDING_ROUND_STATUS_STYLES, computeAverageScore } from '@/lib/allocations';
import { formatCurrency, formatDate } from '@/lib/format';
import StartApplicationForm from '@/components/allocations/StartApplicationForm';
import RoundStatusControl from '@/components/allocations/RoundStatusControl';

export default async function FundingRoundDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canManage = hasGrantCapability(session!.user.role as Role, session!.user.grantRole as GrantRole | null, 'MANAGE_FUNDING_ROUNDS');
  const canManageApplications = hasGrantCapability(session!.user.role as Role, session!.user.grantRole as GrantRole | null, 'MANAGE_APPLICATIONS');

  const round = await db.fundingRound.findUnique({ where: { id: params.id }, include: { granteeApplications: { include: { grantee: { select: { legalName: true } }, evaluations: { select: { scores: true } }, categoryRequests: { include: { allocation: true } } }, orderBy: { createdAt: 'asc' } } } });
  if (!round) notFound();

  const grantees = canManageApplications ? await db.grantee.findMany({ where: { applications: { none: { fundingRoundId: round.id } } }, select: { id: true, legalName: true }, orderBy: { legalName: 'asc' } }) : [];
  const allCategoryRequests = round.granteeApplications.flatMap((a) => a.categoryRequests);
  const totalRequested = allCategoryRequests.reduce((sum, r) => sum + Number(r.requestedAmount), 0);
  const totalAllocated = allCategoryRequests.reduce((sum, r) => sum + (r.allocation ? Number(r.allocation.allocatedAmount) : 0), 0);

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div><div className="flex items-center gap-3"><h1 className="text-2xl font-extrabold text-gray-900">{round.name}</h1><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${FUNDING_ROUND_STATUS_STYLES[round.status]}`}>{FUNDING_ROUND_STATUS_LABELS[round.status]}</span></div>{round.description && <p className="mt-1 text-sm text-gray-600">{round.description}</p>}{round.closesAt && <p className="mt-1 text-[13px] text-gray-500">Closes {formatDate(round.closesAt)}</p>}</div>
        <div className="flex items-center gap-2"><Link href={`/apply/${round.id}`} target="_blank" className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"><ExternalLink size={15} /> Public application</Link>{canManage && <RoundStatusControl roundId={round.id} status={round.status} />}</div>
      </div>

      <div className="mt-6 rounded-[14px] border border-[#bfe4df] bg-[#eff9f7] p-4"><p className="text-sm font-bold text-[#0f6f66]">Community Portal is ready</p><p className="mt-1 text-sm text-gray-600">Share the public application link with agencies when this round is Open. Public submissions automatically create or match the grantee and appear in the application queue.</p><code className="mt-2 block break-all rounded-lg bg-white/80 px-3 py-2 text-xs text-gray-600">/apply/{round.id}</code></div>

      <div className="mt-6 grid grid-cols-4 gap-3">
        <div className="rounded-[12px] bg-gray-50 p-4"><p className="text-[13px] text-gray-600">Funding pool</p><p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(round.totalPool.toString())}</p></div>
        <div className="rounded-[12px] bg-gray-50 p-4"><p className="text-[13px] text-gray-600">Requested</p><p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(totalRequested)}</p></div>
        <div className="rounded-[12px] bg-gray-50 p-4"><p className="text-[13px] text-gray-600">Allocated</p><p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(totalAllocated)}</p></div>
        <div className="rounded-[12px] bg-gray-50 p-4"><p className="text-[13px] text-gray-600">Applications</p><p className="mt-1 text-xl font-semibold text-gray-900">{round.granteeApplications.length}</p></div>
      </div>

      {canManageApplications && <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Start an application</h2><div className="mt-3"><StartApplicationForm fundingRoundId={round.id} grantees={grantees} /></div></div>}

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white"><div className="p-6 pb-0"><h2 className="text-[15px] font-bold text-gray-900">Applications</h2></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600"><th className="px-5 py-3.5">Agency</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Requested</th><th className="px-5 py-3.5 text-right">Allocated</th><th className="px-5 py-3.5 text-center">Score</th></tr></thead><tbody>
        {round.granteeApplications.length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-600">No applications yet.</td></tr>}
        {round.granteeApplications.map((app) => { const requested = app.categoryRequests.reduce((sum, r) => sum + Number(r.requestedAmount), 0); const allocated = app.categoryRequests.reduce((sum, r) => sum + (r.allocation ? Number(r.allocation.allocatedAmount) : 0), 0); const score = computeAverageScore(app.evaluations); return <tr key={app.id} className="border-b border-gray-100 last:border-0"><td className="px-5 py-3.5"><Link href={`/grantee-applications/${app.id}`} className="font-semibold text-gray-900 hover:text-evergreen">{app.grantee.legalName}</Link></td><td className="px-5 py-3.5 text-gray-600">{app.status}</td><td className="px-5 py-3.5 text-right">{formatCurrency(requested)}</td><td className="px-5 py-3.5 text-right font-medium">{formatCurrency(allocated)}</td><td className="px-5 py-3.5 text-center">{score === null ? <span className="text-gray-400">—</span> : <span className="rounded-[8px] bg-sky/10 px-2 py-0.5 text-[12px] font-semibold text-sky">{score.toFixed(1)}</span>}</td></tr>; })}
      </tbody></table></div></div>
    </div>
  );
}
