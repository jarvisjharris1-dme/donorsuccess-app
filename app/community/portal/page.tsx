import Link from 'next/link';
import { redirect } from 'next/navigation';
import Logo from '@/components/layout/Logo';
import { communityLogoutAction } from '@/lib/actions/community-auth';
import { getCommunityApplicantSession, getCommunityBranding } from '@/lib/community-portal';
import { prisma } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/format';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_STYLES } from '@/lib/allocations';

export default async function CommunityPortalPage() {
  const session = await getCommunityApplicantSession();
  if (!session) redirect('/community');

  const [branding, applications] = await Promise.all([
    getCommunityBranding(session.organizationId),
    prisma.granteeApplication.findMany({
      where: { organizationId: session.organizationId, granteeId: session.granteeId },
      orderBy: { createdAt: 'desc' },
      include: {
        fundingRound: { select: { id: true, name: true, closesAt: true, status: true } },
        categoryRequests: { select: { requestedAmount: true } },
      },
    }),
  ]);

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
          <form action={communityLogoutAction}><button className="text-sm font-semibold text-gray-600 hover:text-gray-900">Sign out</button></form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-[.17em] text-[#0f6f66]">Community Portal</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">Welcome, {session.name || session.granteeName}</h1>
        <p className="mt-2 text-sm text-gray-600">Manage applications for <strong>{session.granteeName}</strong> and track each funding decision.</p>

        <div className="mt-8 grid gap-4">
          {applications.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="font-semibold text-gray-800">No applications are connected to this portal yet.</p>
            </div>
          )}

          {applications.map((application) => {
            const requested = application.categoryRequests.reduce((sum, row) => sum + Number(row.requestedAmount), 0);
            const statusLabel = APPLICATION_STATUS_LABELS[application.status];
            const statusStyle = APPLICATION_STATUS_STYLES[application.status];
            return (
              <Link key={application.id} href={`/community/portal/applications/${application.id}`} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-extrabold text-gray-950 group-hover:text-[#0f6f66]">{application.fundingRound.name}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle}`}>{statusLabel}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {application.submittedAt ? `Submitted ${formatDate(application.submittedAt)}` : 'Draft — continue when you are ready'}
                      {application.fundingRound.closesAt ? ` · Deadline ${formatDate(application.fundingRound.closesAt)}` : ''}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Requested</p>
                    <p className="mt-1 text-lg font-extrabold text-gray-900">{formatCurrency(requested)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 border-t border-gray-200 pt-6 text-xs text-gray-500 sm:hidden">
          <span>Powered by</span><Logo height={24} />
        </div>
      </div>
    </main>
  );
}
