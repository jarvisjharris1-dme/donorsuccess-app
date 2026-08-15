import Link from 'next/link';
import { Plus } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role, OpportunityStage } from '@prisma/client';
import { ORDERED_STAGES, OPEN_STAGES, STAGE_LABELS, effectiveProbability } from '@/lib/pipeline';
import { donorDisplayName, formatCurrency } from '@/lib/format';
import OpportunityCard, { type OpportunityCardData } from '@/components/pipeline/OpportunityCard';
import ViewScopeToggle from '@/components/shared/ViewScopeToggle';
import { resolveScope } from '@/lib/scope';

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: { scope?: string };
}) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canCreate = permissions.canEditDonors(session!.user.role as Role);
  const scope = resolveScope(session!.user.role as Role, searchParams.scope);

  const opportunities = await db.opportunity.findMany({
    where: scope === 'mine' ? { ownerId: session!.user.id } : {},
    orderBy: { updatedAt: 'desc' },
    include: {
      donor: { select: { firstName: true, lastName: true, organizationName: true } },
      owner: { select: { name: true, email: true } },
    },
  });

  const byStage = new Map<string, OpportunityCardData[]>();
  for (const stage of ORDERED_STAGES) byStage.set(stage, []);

  let openAskTotal = 0;
  let weightedForecast = 0;

  for (const o of opportunities) {
    const askNum = o.askAmount ? Number(o.askAmount) : 0;
    if (OPEN_STAGES.includes(o.stage)) {
      openAskTotal += askNum;
      weightedForecast += (askNum * effectiveProbability(o.stage, o.probability)) / 100;
    }

    byStage.get(o.stage)?.push({
      id: o.id,
      name: o.name,
      donorId: o.donorId,
      donorName: donorDisplayName(o.donor),
      stage: o.stage,
      askAmount: o.askAmount ? o.askAmount.toString() : null,
      expectedCloseDate: o.expectedCloseDate ? o.expectedCloseDate.toISOString() : null,
      ownerName: o.owner.name ?? o.owner.email,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-600">
            {opportunities.length} opportunit{opportunities.length === 1 ? 'y' : 'ies'}
            {scope === 'mine' ? ' assigned to you' : ''}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/pipeline/new"
            className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
          >
            <Plus size={16} />
            New Opportunity
          </Link>
        )}
      </div>

      <div className="mt-5">
        <ViewScopeToggle activeScope={scope} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Open pipeline (ask)" value={formatCurrency(openAskTotal)} />
        <SummaryCard label="Weighted forecast" value={formatCurrency(weightedForecast)} />
        <SummaryCard
          label="Open opportunities"
          value={String(opportunities.filter((o) => OPEN_STAGES.includes(o.stage)).length)}
        />
        <SummaryCard
          label="Closed won (all time)"
          value={String(opportunities.filter((o) => o.stage === OpportunityStage.CLOSED_WON).length)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-3 lg:grid-cols-6">
        {ORDERED_STAGES.map((stage) => {
          const cards = byStage.get(stage) ?? [];
          return (
            <div key={stage} className="min-w-[220px]">
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-[13px] font-bold text-gray-900">{STAGE_LABELS[stage]}</h3>
                <span className="text-xs font-semibold text-gray-600">{cards.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {cards.length === 0 ? (
                  <div className="rounded-[14px] border border-dashed border-gray-200 p-4 text-center text-xs text-gray-600">
                    No opportunities
                  </div>
                ) : (
                  cards.map((c) => <OpportunityCard key={c.id} opportunity={c} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-gray-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 truncate text-lg font-extrabold text-gray-900">{value}</div>
    </div>
  );
}
