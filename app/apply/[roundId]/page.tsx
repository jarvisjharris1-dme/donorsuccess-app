import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { submitPublicApplicationAction } from '@/lib/actions/public-applications';
import { formatCurrency, formatDate } from '@/lib/format';

export default async function PublicApplicationPage({ params, searchParams }: { params: { roundId: string }; searchParams: { error?: string } }) {
  const round = await prisma.fundingRound.findUnique({
    where: { id: params.roundId },
    include: { organization: { select: { name: true } } },
  });
  if (!round) notFound();

  const now = new Date();
  const isOpen = round.status === 'OPEN' && (!round.opensAt || now >= round.opensAt) && (!round.closesAt || now <= round.closesAt);
  const messages: Record<string, string> = {
    closed: 'This funding opportunity is not currently accepting applications.',
    required: 'Please complete all required fields and enter a valid request amount.',
    category: 'Please select an available funding category.',
    certifications: 'All eligibility certifications must be confirmed before submission.',
    duplicate: 'An application for this organization has already been started or submitted for this funding round.',
  };

  const input = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#16877c] focus:ring-2 focus:ring-[#16877c]/15';
  const label = 'mb-1.5 block text-sm font-semibold text-gray-900';

  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div><p className="text-lg font-extrabold text-[#0f6f66]">Donor Success</p><p className="text-xs font-semibold uppercase tracking-[.18em] text-gray-400">Community Portal</p></div>
          <p className="text-sm font-semibold text-gray-600">{round.organization.name}</p>
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
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-extrabold text-gray-950">Apply for funding</h2>
          <p className="mt-1 text-sm text-gray-600">Submit your organization and program request directly to {round.organization.name}.</p>
          {searchParams.error && messages[searchParams.error] && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{messages[searchParams.error]}</p>}
          {!isOpen ? <p className="mt-6 rounded-xl bg-gray-50 p-5 text-sm text-gray-600">Applications are currently closed for this opportunity.</p> : (
            <form action={submitPublicApplicationAction.bind(null, round.id)} className="mt-7 space-y-7">
              <fieldset className="space-y-4"><legend className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#0f6f66]">1. Organization</legend>
                <div><label className={label}>Legal organization name *</label><input name="legalName" required className={input} /></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>EIN</label><input name="ein" className={input} placeholder="12-3456789" /></div><div><label className={label}>Primary contact *</label><input name="contactName" required className={input} /></div></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>Email *</label><input name="contactEmail" type="email" required className={input} /></div><div><label className={label}>Phone</label><input name="contactPhone" className={input} /></div></div>
                <div><label className={label}>Street address</label><input name="addressLine1" className={input} /></div>
                <div className="grid gap-4 sm:grid-cols-3"><div><label className={label}>City</label><input name="city" className={input} /></div><div><label className={label}>State</label><input name="state" className={input} /></div><div><label className={label}>ZIP</label><input name="postalCode" className={input} /></div></div>
                <div><label className={label}>Mission / organization summary</label><textarea name="missionSummary" rows={3} className={input} /></div>
              </fieldset>

              <fieldset className="space-y-4"><legend className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#0f6f66]">2. Funding request</legend>
                <div><label className={label}>Funding category *</label><select name="category" required className={input}><option value="">Select a category</option>{round.categories.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>Amount requested *</label><input name="requestedAmount" type="number" min="1" step="0.01" required className={input} /></div><div><label className={label}>Projected people / units served</label><input name="unitsProjected" type="number" min="0" className={input} /></div></div>
                <div><label className={label}>Target population</label><textarea name="targetPopulation" rows={2} className={input} /></div>
                <div><label className={label}>Intake / eligibility process</label><textarea name="intakeProcess" rows={2} className={input} /></div>
                <div><label className={label}>Program delivery method</label><textarea name="deliveryMethod" rows={2} className={input} /></div>
                <div className="grid gap-4 sm:grid-cols-2"><div><label className={label}>County</label><input name="county" className={input} /></div><div><label className={label}>Service location</label><input name="serviceLocation" className={input} /></div></div>
              </fieldset>

              <fieldset><legend className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#0f6f66]">3. Certifications</legend><div className="space-y-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <label className="flex gap-3"><input type="checkbox" name="notOnWatchList" required className="mt-1" /><span>I certify that the organization is not on applicable exclusion or watch lists.</span></label>
                <label className="flex gap-3"><input type="checkbox" name="patriotActCompliant" required className="mt-1" /><span>I certify that the organization complies with applicable USA PATRIOT Act requirements.</span></label>
                <label className="flex gap-3"><input type="checkbox" name="notDebarred" required className="mt-1" /><span>I certify that the organization is not suspended or debarred from receiving funds.</span></label>
              </div></fieldset>

              <button type="submit" className="w-full rounded-xl bg-[#0f6f66] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#0b5d56]">Submit application</button>
              <p className="text-center text-xs leading-5 text-gray-500">By submitting, you confirm the information provided is accurate and may be reviewed by the funding organization.</p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
