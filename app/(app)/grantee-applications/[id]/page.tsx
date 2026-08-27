import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_STYLES, computeAverageScore } from '@/lib/allocations';
import { formatCurrency, formatDate } from '@/lib/format';
import ComplianceForm from '@/components/allocations/ComplianceForm';
import CategoryRequestsSection from '@/components/allocations/CategoryRequestsSection';
import EvaluationForm from '@/components/allocations/EvaluationForm';
import AllocationForm from '@/components/allocations/AllocationForm';
import SubmitApplicationButton from '@/components/allocations/SubmitApplicationButton';

export default async function GranteeApplicationDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const role = session!.user.role as Role;
  const grantRole = session!.user.grantRole as GrantRole | null;

  const canManageApplications = hasGrantCapability(role, grantRole, 'MANAGE_APPLICATIONS');
  const canScore = hasGrantCapability(role, grantRole, 'SCORE_APPLICATIONS');
  const canDecideAllocations = hasGrantCapability(role, grantRole, 'MANAGE_FUNDING_ROUNDS');

  const application = await db.granteeApplication.findUnique({
    where: { id: params.id },
    include: {
      grantee: true,
      fundingRound: true,
      categoryRequests: { include: { allocation: true }, orderBy: { createdAt: 'asc' } },
      evaluations: { include: { reviewer: { select: { name: true, email: true } } } },
    },
  });
  if (!application) notFound();

  const criteria = Array.isArray(application.fundingRound.rubricCriteria)
    ? (application.fundingRound.rubricCriteria as string[])
    : [];

  const myEvaluation = application.evaluations.find((e) => e.reviewerId === session!.user.id);
  const otherEvaluations = application.evaluations.filter((e) => e.reviewerId !== session!.user.id);
  const averageScore = computeAverageScore(application.evaluations);

  return (
    <div className="max-w-4xl">
      <p className="text-[13px] text-gray-500">
        <Link href={`/funding-rounds/${application.fundingRound.id}`} className="hover:text-gray-700">
          {application.fundingRound.name}
        </Link>
      </p>
      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-gray-900">{application.grantee.legalName}</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${APPLICATION_STATUS_STYLES[application.status]}`}
          >
            {APPLICATION_STATUS_LABELS[application.status]}
          </span>
        </div>
        {canManageApplications && application.status === 'DRAFT' && (
          <SubmitApplicationButton applicationId={application.id} />
        )}
      </div>
      {application.submittedAt && (
        <p className="mt-1 text-[13px] text-gray-500">Submitted {formatDate(application.submittedAt)}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Compliance certifications</h2>
          <div className="mt-4">
            <ComplianceForm
              applicationId={application.id}
              notOnWatchList={application.notOnWatchList}
              patriotActCompliant={application.patriotActCompliant}
              notDebarred={application.notDebarred}
            />
          </div>
        </div>

        <div className="rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Reviewer score</h2>
          <p className="mt-3 text-3xl font-extrabold text-gray-900">
            {averageScore === null ? '—' : averageScore.toFixed(1)}
            <span className="text-base font-medium text-gray-500"> / 5</span>
          </p>
          <p className="mt-1 text-[13px] text-gray-600">
            {application.evaluations.length} of {criteria.length > 0 ? 'assigned reviewers' : 'reviewers'} scored
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Service categories</h2>
        <div className="mt-4">
          <CategoryRequestsSection
            applicationId={application.id}
            categories={application.fundingRound.categories}
            requests={application.categoryRequests.map((r) => ({
              id: r.id,
              category: r.category,
              requestedAmount: r.requestedAmount.toString(),
              targetPopulation: r.targetPopulation,
              intakeProcess: r.intakeProcess,
              deliveryMethod: r.deliveryMethod,
              county: r.county,
              serviceLocation: r.serviceLocation,
              unitsProjected: r.unitsProjected,
            }))}
            canEdit={canManageApplications}
          />
        </div>
      </div>

      {canScore && (
        <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Your evaluation</h2>
          {criteria.length === 0 ? (
            <p className="mt-3 text-[13px] text-gray-600">
              This round has no scoring rubric configured yet.
            </p>
          ) : (
            <div className="mt-4">
              <EvaluationForm
                applicationId={application.id}
                criteria={criteria}
                initialScores={myEvaluation ? (myEvaluation.scores as number[]) : undefined}
                initialComment={myEvaluation?.comment}
              />
            </div>
          )}
        </div>
      )}

      {otherEvaluations.length > 0 && (
        <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Other reviewers</h2>
          <div className="mt-4 flex flex-col gap-4">
            {otherEvaluations.map((e) => {
              const scores = e.scores as number[];
              const evalTotal = scores.reduce((a, b) => a + b, 0);
              return (
                <div key={e.id} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-gray-900">{e.reviewer.name ?? e.reviewer.email}</p>
                    <p className="text-[13px] font-semibold text-gray-900">
                      {evalTotal} / {criteria.length * 5}
                    </p>
                  </div>
                  {e.comment && <p className="mt-1.5 text-[13px] text-gray-600">{e.comment}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {canDecideAllocations && application.categoryRequests.length > 0 && (
        <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Allocation decision</h2>
          <div className="mt-2 grid grid-cols-[1fr_repeat(4,110px)_auto] gap-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <span>Category</span>
            <span className="text-right">Prior</span>
            <span className="text-right">Requested</span>
            <span className="text-right">Allocated</span>
            <span className="text-right">Award</span>
            <span />
          </div>
          <div>
            {application.categoryRequests.map((r) => (
              <AllocationForm
                key={r.id}
                categoryRequestId={r.id}
                category={r.category}
                requestedAmount={r.requestedAmount.toString()}
                previousAllocated={r.allocation?.previousAllocated.toString()}
                allocatedAmount={r.allocation?.allocatedAmount.toString()}
                awardAmount={r.allocation?.awardAmount.toString()}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
