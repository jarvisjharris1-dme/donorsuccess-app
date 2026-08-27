import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { prisma } from '@/lib/db';
import { getCommunityBranding } from '@/lib/community-portal';

export default async function ApplicationSubmittedPage({ params }: { params: { roundId: string } }) {
  const round = await prisma.fundingRound.findUnique({
    where: { id: params.roundId },
    select: { organizationId: true, organization: { select: { name: true } } },
  });
  const branding = round ? await getCommunityBranding(round.organizationId).catch(() => null) : null;

  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={`${round?.organization.name ?? 'Funding organization'} logo`} className="max-h-14 max-w-[230px] object-contain" />
            ) : (
              <p className="text-lg font-extrabold text-gray-900">{round?.organization.name ?? 'Community Funding'}</p>
            )}
          </div>
          <div className="flex items-center gap-3"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-gray-400">Powered by</span><Logo height={30} /></div>
        </div>
      </header>

      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={30} /></div>
          <p className="mt-6 text-sm font-extrabold uppercase tracking-[.18em] text-[#0f6f66]">Community Portal</p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-950">Application submitted</h1>
          <p className="mt-4 text-[15px] leading-7 text-gray-600">Thank you. Your organization and funding request have been delivered to the funding organization for review. Secure applicant access has also been created so you can track status and manage supporting documents.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href="/community/portal" className="inline-flex justify-center rounded-xl bg-[#0f6f66] px-5 py-3 text-sm font-bold text-white hover:bg-[#0b5d56]">View my application</Link>
            <Link href={`/apply/${params.roundId}`} className="inline-flex justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Return to opportunity</Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 border-t border-gray-100 pt-6"><span className="text-xs text-gray-400">Powered by</span><Logo height={25} /></div>
        </div>
      </div>
    </main>
  );
}
