import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { savePublicApplicationDraftAction, submitPublicApplicationAction } from '@/lib/actions/public-applications';
import { formatCurrency, formatDate } from '@/lib/format';
import { getCommunityApplicantSession, getCommunityBranding } from '@/lib/community-portal';
import Logo from '@/components/layout/Logo';

export default async function PublicApplicationPage({
  params,
  searchParams,
}: {
  params: { roundId: string };
  searchParams: { error?: string; resume?: string };
}) {
  const round = await prisma.fundingRound.findUnique({
    where: { id: params.roundId },
    include: { organization: { select: { name: true } } },
  });
  if (!round) notFound();

  const branding = await getCommunityBranding(round.organizationId).catch(() => null);
  const portalSession = searchParams.resume ? await getCommunityApplicantSession().catch(() => null) : null;
  const draft = searchParams.resume && portalSession
    ? await prisma.granteeApplication.findFirst({
        where: {
          id: searchParams.resume,
          fundingRoundId: round.id,
          organizationId: portalSession.organizationId,
          granteeId: portalSession.granteeId,
          status: 'DRAFT',
        },
        include: { grantee: true, categoryRequests: { orderBy: { createdAt: 'asc' }, take: 1 } },
      })
    : null;
  const request = draft?.categoryRequests[0];

  const now = new Date();
  const isOpen = round.status === 'OPEN' && (!round.opensAt || now >= round.opensAt) && (!round.closesAt || now <= round.closesAt);
  const messages: Record<string, string> = {
    closed: 'This funding opportunity is not currently accepting applications.',
    required: 'Please complete all required fields and enter a valid request amount.',
    category: 'Please select an available funding category.',
    certifications: 'All eligibility certifications must be confirmed before submission.',
    duplicate: 'An application for this organization has already been submitted for this funding round.',
  };

  const input = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#16877c] focus:ring-2 focus:ring-[#16877c]/15';
  const label = 'mb-1.5 block text-sm font-semibold text-gray-900';

  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={`${round.organization.name} logo`} className="max-h-14 max-w-[230px] object-contain" />
            ) : (
              <div><p className="text-lg font-extrabold text-gray-900">{round.organization.name}</p><p className="text-xs font-semibold uppercase tracking-[.18em] text-gray-400">Community Funding</p></div>
            )}
          </div>
          <div className="flex items-center gap-3 border-t border-gray-100 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-gray-400">Powered by</span>
            <Logo height={30} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[.8fr_1.2fr]">
        <section>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>{isOpen ? 'Accepting applications' : 'Not accepting applications'}</span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-950">{round.name}</h1>
          {round.description && <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-gray-600">{round.description}</p>}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Funding pool</p>
            <p className="mt-1 text-2xl font-extrabold text-gray-900">{formatCurrency(round.totalPool.toString())}</p>
            {round.closesAt && <p className="mt-4 text-sm text-gray-600"><strong>Application deadline:</strong> {formatDate(round.closesAt)}</p>}
            <p className="mt-4 text-sm font-semibold text-gray-900">Available categories</p>
            <div className="mt-2 flex flex-wrap gap-2">{round.categories.map((c) => <span key={c} className="rounded-full bg-[#e9f5f3] px-3 py-1 text-xs font-semibold text-[#0f6f66]">{c}</span>)}</div>
          </div>
          <div className="mt-5 rounded-2xl bg-[#0f6f66] p-5 text-white">
            <p className="text-sm font-bold">Already started?</p>
            <p className="mt-1 text-sm text-white/80">Use your secure Community Portal to continue a saved draft or check a submitted application.</p>
            <Link href="/community" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0f6f66]">Applicant sign in</Link>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-gray-950">{draft ? 'Continue your application' : 'Apply for funding'}</h2>
              <p className="mt-1 text-sm text-gray-600">Submit your organization and program request directly to {round.organization.name}.</p>
            </div>
            {draft && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">Draft saved</span>}
          </div>
          {searchParams.resume && !draft && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">That draft could not be opened from this session. Sign in to the Community Portal and try again.</p>}
          {searchParams.error && messages[searchParams.error] && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{messages[searchParams.error]}</p>}
          {!isOpen ? <p className="mt-6 rounded-xl bg-gray-50 p-5 text-sm text-gray-600">Applications are currently closed for this opportunity.</p> : (
            <form action={submitPublicApplicationAction.bind(null, round.id)} className="mt-7 space-y-7">
              <fieldset className="space-y-4"><legend className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#0f6f66]">1. Organization</legend>
                <div><label className={label}>Legal organization name *</label><input name="legalName" required className={input} defaultValue={draft?.grantee.legalName ?? ''} /></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>EIN</label><input name="ein" className={input} placeholder="12-3456789" defaultValue={draft?.grantee.ein ?? ''} /></div><div><label className={label}>Primary contact *</label><input name="contactName" required className={input} defaultValue={draft?.grantee.contactName ?? portalSession?.name ?? ''} /></div></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>Email *</label><input name="contactEmail" type="email" required className={input} defaultValue={draft?.grantee.contactEmail ?? portalSession?.email ?? ''} /></div><div><label className={label}>Phone</label><input name="contactPhone" className={input} defaultValue={draft?.grantee.contactPhone ?? ''} /></div></div>
                <div><label className={label}>Street address</label><input name="addressLine1" className={input} defaultValue={draft?.grantee.addressLine1 ?? ''} /></div>
                <div className="grid gap-4 sm:grid-cols-3"><div><label className={label}>City</label><input name="city" className={input} defaultValue={draft?.grantee.city ?? ''} /></div><div><label className={label}>State</label><input name="state" className={input} defaultValue={draft?.grantee.state ?? ''} /></div><div><label className={label}>ZIP</label><input name="postalCode" className={input} defaultValue={draft?.grantee.postalCode ?? ''} /></div></div>
                <div><label className={label}>Mission / organization summary</label><textarea name="missionSummary" rows={3} className={input} defaultValue={draft?.grantee.missionSummary ?? ''} /></div>
              </fieldset>

              <fieldset className="space-y-4"><legend className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#0f6f66]">2. Funding request</legend>
                <div><label className={label}>Funding category *</label><select name="category" required className={input} defaultValue={request?.category ?? ''}><option value="">Select a category</option>{round.categories.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>Amount requested *</label><input name="requestedAmount" type="number" min="1" step="0.01" required className={input} defaultValue={request ? request.requestedAmount.toString() : ''} /></div><div><label className={label}>Projected people / units served</label><input name="unitsProjected" type="number" min="0" className={input} defaultValue={request?.unitsProjected ?? ''} /></div></div>
                <div><label className={label}>Target population</label><textarea name="targetPopulation" rows={2} className={input} defaultValue={request?.targetPopulation ?? ''} /></div>
                <div><label className={label}>Intake / eligibility process</label><textarea name="intakeProcess" rows={2} className={input} defaultValue={request?.intakeProcess ?? ''} /></div>
                <div><label className={label}>Program delivery method</label><textarea name="deliveryMethod" rows={2} className={input} defaultValue={request?.deliveryMethod ?? ''} /></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>County</label><input name="county" className={input} defaultValue={request?.county ?? ''} /></div><div><label className={label}>Service location</label><input name="serviceLocation" className={input} defaultValue={request?.serviceLocation ?? ''} /></div></div>
              </fieldset>

              <fieldset><legend className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#0f6f66]">3. Certifications</legend><div className="space-y-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <label className="flex gap-3"><input type="checkbox" name="notOnWatchList" required className="mt-1" defaultChecked={draft?.notOnWatchList ?? false} /><span>I certify that the organization is not on applicable exclusion or watch lists.</span></label>
                <label className="flex gap-3"><input type="checkbox" name="patriotActCompliant" required className="mt-1" defaultChecked={draft?.patriotActCompliant ?? false} /><span>I certify that the organization complies with applicable USA PATRIOT Act requirements.</span></label>
                <label className="flex gap-3"><input type="checkbox" name="notDebarred" required className="mt-1" defaultChecked={draft?.notDebarred ?? false} /><span>I certify that the organization is not suspended or debarred from receiving funds.</span></label>
              </div></fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <button formAction={savePublicApplicationDraftAction.bind(null, round.id)} formNoValidate className="rounded-xl border border-[#0f6f66] bg-white px-5 py-3.5 text-sm font-bold text-[#0f6f66] transition hover:bg-[#e9f5f3]">Save & continue later</button>
                <button type="submit" className="rounded-xl bg-[#0f6f66] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#0b5d56]">Submit application</button>
              </div>
              <p className="text-center text-xs leading-5 text-gray-500">Save creates secure applicant access. By submitting, you confirm the information provided is accurate and may be reviewed by the funding organization.</p>
            </form>
          )}
        </section>
      </div>
      <footer className="border-t border-gray-200 bg-white px-6 py-6"><div className="mx-auto flex max-w-5xl items-center justify-center gap-3"><span className="text-xs font-semibold text-gray-400">Community funding technology powered by</span><Logo height={26} /></div></footer>
    </main>
  );
}
