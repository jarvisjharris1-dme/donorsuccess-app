import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Logo from '@/components/layout/Logo';
import { getCommunityApplicantSession, getCommunityBranding } from '@/lib/community-portal';
import { prisma } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/format';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_STYLES } from '@/lib/allocations';
import {
  removeCommunityApplicationDocumentAction,
  uploadCommunityApplicationDocumentAction,
} from '@/lib/actions/community-documents';

export default async function CommunityApplicationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const session = await getCommunityApplicantSession();
  if (!session) redirect('/community');

  const application = await prisma.granteeApplication.findFirst({
    where: {
      id: params.id,
      organizationId: session.organizationId,
      granteeId: session.granteeId,
    },
    include: {
      fundingRound: true,
      grantee: true,
      categoryRequests: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!application) notFound();

  const branding = await getCommunityBranding(session.organizationId).catch(() => null);
  type DocumentRow = {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string | null;
    createdAt: Date;
  };
  const documents = await prisma.$queryRawUnsafe<DocumentRow[]>(
    `SELECT "id", "fileName", "fileSize", "mimeType", "createdAt"
     FROM "community_application_documents"
     WHERE "applicationId" = $1 AND "organizationId" = $2
     ORDER BY "createdAt" DESC`,
    application.id,
    session.organizationId,
  );

  const totalRequested = application.categoryRequests.reduce((sum, row) => sum + Number(row.requestedAmount), 0);
  const statusLabel = APPLICATION_STATUS_LABELS[application.status];
  const statusStyle = APPLICATION_STATUS_STYLES[application.status];
  const canContinue = application.status === 'DRAFT' && application.fundingRound.status === 'OPEN';

  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={`${session.organizationName} logo`} className="max-h-12 max-w-[190px] object-contain" />
            ) : (
              <p className="truncate text-base font-extrabold text-gray-900">{session.organizationName}</p>
            )}
            <div className="hidden items-center gap-2 border-l border-gray-200 pl-4 sm:flex">
              <span className="text-[10px] font-bold uppercase tracking-[.15em] text-gray-400">Powered by</span>
              <Logo height={24} />
            </div>
          </div>
          <Link href="/community/portal" className="text-sm font-semibold text-gray-600 hover:text-gray-900">All applications</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/community/portal" className="text-sm font-semibold text-[#0f6f66]">← Back to Community Portal</Link>

        {searchParams.saved === '1' && (
          <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            Your draft is saved. We also sent a secure portal access link to your email.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-950">{application.fundingRound.name}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>{statusLabel}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {application.submittedAt ? `Submitted ${formatDate(application.submittedAt)}` : 'Application draft'}
              {application.fundingRound.closesAt ? ` · Deadline ${formatDate(application.fundingRound.closesAt)}` : ''}
            </p>
          </div>
          {canContinue && (
            <Link href={`/apply/${application.fundingRoundId}?resume=${application.id}`} className="inline-flex justify-center rounded-xl bg-[#0f6f66] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b5d56]">
              Continue application
            </Link>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Organization</p>
            <p className="mt-2 font-extrabold text-gray-900">{application.grantee.legalName}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Requested</p>
            <p className="mt-2 text-xl font-extrabold text-gray-900">{formatCurrency(totalRequested)}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Documents</p>
            <p className="mt-2 text-xl font-extrabold text-gray-900">{documents.length}</p>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-extrabold text-gray-950">Funding request</h2>
          <div className="mt-4 divide-y divide-gray-100">
            {application.categoryRequests.length === 0 ? (
              <p className="py-5 text-sm text-gray-500">No funding request has been added to this draft yet.</p>
            ) : application.categoryRequests.map((request) => (
              <div key={request.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-bold text-gray-900">{request.category}</p>
                  {request.targetPopulation && <p className="mt-1 text-sm text-gray-600">Target population: {request.targetPopulation}</p>}
                  {request.serviceLocation && <p className="mt-1 text-sm text-gray-600">Service location: {request.serviceLocation}</p>}
                </div>
                <p className="font-extrabold text-gray-900">{formatCurrency(request.requestedAmount.toString())}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-gray-950">Supporting documents</h2>
              <p className="mt-1 text-sm text-gray-600">Upload budgets, financials, program materials, certifications, or other supporting files.</p>
            </div>
          </div>

          <form action={uploadCommunityApplicationDocumentAction.bind(null, application.id)} className="mt-5 flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">Choose document</label>
              <input type="file" name="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
              <p className="mt-1 text-xs text-gray-500">PDF, Word, Excel, PNG, JPG or WebP · up to 10 MB.</p>
            </div>
            <button type="submit" className="rounded-xl bg-[#0f6f66] px-5 py-3 text-sm font-bold text-white">Upload document</button>
          </form>

          <div className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200">
            {documents.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">No supporting documents uploaded yet.</p>
            ) : documents.map((document) => (
              <div key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/community/portal/documents/${document.id}`} className="truncate text-sm font-bold text-[#0f6f66] hover:underline">{document.fileName}</Link>
                  <p className="mt-1 text-xs text-gray-500">{(document.fileSize / 1024 / 1024).toFixed(1)} MB · Uploaded {formatDate(document.createdAt)}</p>
                </div>
                <form action={removeCommunityApplicationDocumentAction.bind(null, application.id, document.id)}>
                  <button type="submit" className="text-xs font-bold text-red-600 hover:text-red-700">Remove</button>
                </form>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex items-center justify-center gap-2 border-t border-gray-200 pt-6 text-xs text-gray-500 sm:hidden">
          <span>Powered by</span><Logo height={24} />
        </div>
      </div>
    </main>
  );
}
