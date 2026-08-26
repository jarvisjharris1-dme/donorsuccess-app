import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/orders';
import { provisionOrderAction, retryOwnerInvitationAction, updateOrderStatusAction } from '@/lib/actions/orders';

function money(cents: number | null) {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function when(value: Date | null) {
  return value ? value.toLocaleString() : 'Pending';
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const products = order.productsJson ? (JSON.parse(order.productsJson) as string[]) : [];
  const canProvision = ['SIGNED', 'FAILED'].includes(order.status) && !order.organizationId;
  const needsInvitationRetry = Boolean(order.organizationId) && !order.invitationSentAt;
  const completedSteps = [
    Boolean(order.signedAt), Boolean(order.organizationId), Boolean(order.entitlementsProvisionedAt),
    Boolean(order.invitationSentAt), Boolean(order.onboardingStartedAt), Boolean(order.fulfilledAt),
  ].filter(Boolean).length;
  const progress = Math.round((completedSteps / 6) * 100);

  const nextAction = canProvision
    ? 'The agreement is signed. Provision the customer workspace and invite the owner.'
    : needsInvitationRetry
      ? `The customer workspace exists, but the owner invitation has not been confirmed as sent. Retry the invitation to ${order.ownerEmail}.`
      : order.status === 'READY_FOR_KICKOFF'
        ? 'Customer workspace is ready. Start implementation when onboarding begins.'
        : order.status === 'IMPLEMENTATION'
          ? 'Implementation is underway. Mark fulfilled when launch work is complete.'
          : order.status === 'FULFILLED'
            ? 'Customer fulfillment is complete.'
            : 'Waiting for the next lifecycle milestone.';

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="text-sm font-semibold text-gray-400 hover:text-white">← Orders & Fulfillment</Link>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">{order.orderNumber}</h1>
            <span className="rounded-full bg-evergreen/20 px-3 py-1 text-xs font-bold text-teal">{order.status.replaceAll('_', ' ')}</span>
          </div>
          <p className="mt-2 text-gray-400">{order.organizationName} · {order.ownerEmail}</p>
        </div>
        {order.organizationId && <Link href={`/admin/organizations/${order.organizationId}`} className="rounded-xl bg-evergreen px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0d685f]">View customer account</Link>}
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-800/70 to-gray-900 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-warning">Fulfillment Command Center</p>
            <h2 className="mt-2 text-xl font-extrabold text-white">{order.organizationName} launch readiness</h2>
            <p className="mt-1 text-sm text-gray-400">Signed agreement through customer activation and implementation.</p>
          </div>
          <div className="min-w-44">
            <div className="flex items-center justify-between text-xs font-bold text-gray-400"><span>Progress</span><span>{progress}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-700"><div className="h-full rounded-full bg-teal" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5 lg:col-span-2">
          <h2 className="text-base font-bold text-white">Commercial summary</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Plan" value={order.subscriptionTier} />
            <Field label="Billing" value={order.billingPeriod ?? '—'} />
            <Field label="ARR" value={money(order.arrCents)} />
            <Field label="One-time" value={money(order.oneTimeCents)} />
            <Field label="TurboQuote" value={order.quoteId ?? '—'} />
            <Field label="TurboSign document" value={order.turboSignDocumentId ?? 'Auto-link pending'} />
          </div>
          <div className="mt-5 border-t border-gray-800 pt-5">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Provisioned products / modules</div>
            <div className="mt-2 flex flex-wrap gap-2">{products.length ? products.map((p) => <span key={p} className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">✓ {p}</span>) : <span className="text-sm text-gray-500">Plan entitlements follow the subscription tier.</span>}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
          <h2 className="text-base font-bold text-white">Next action</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">{nextAction}</p>
          {canProvision && <form action={provisionOrderAction} className="mt-6"><input type="hidden" name="orderId" value={order.id} /><button type="submit" className="w-full rounded-xl bg-evergreen px-4 py-3 text-sm font-bold text-white hover:bg-[#0d685f]">Provision Customer</button></form>}
          {needsInvitationRetry && <form action={retryOwnerInvitationAction} className="mt-6"><input type="hidden" name="orderId" value={order.id} /><button type="submit" className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-gray-950 hover:bg-amber-400">Retry Owner Invitation</button></form>}
          {!needsInvitationRetry && order.organizationId && order.status === 'READY_FOR_KICKOFF' && <StatusButton orderId={order.id} status="IMPLEMENTATION" label="Start Implementation" />}
          {!needsInvitationRetry && order.status === 'IMPLEMENTATION' && <StatusButton orderId={order.id} status="FULFILLED" label="Mark Fulfilled" />}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-6">
        <div className="mb-5"><h2 className="text-base font-bold text-white">Fulfillment checklist</h2><p className="mt-1 text-sm text-gray-500">Operational milestones recorded by the fulfillment engine.</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Milestone label="Contract signed" done={Boolean(order.signedAt)} detail={when(order.signedAt)} />
          <Milestone label="Organization created" done={Boolean(order.organizationId)} detail={order.organizationId ? 'Customer workspace active' : 'Pending provisioning'} />
          <Milestone label={`${order.subscriptionTier} + product entitlements`} done={Boolean(order.entitlementsProvisionedAt)} detail={when(order.entitlementsProvisionedAt)} />
          <Milestone label="Owner / admin invitation" done={Boolean(order.invitationSentAt)} detail={order.invitationSentAt ? `Sent to ${order.ownerEmail}` : 'Pending — retry available'} />
          <Milestone label="Onboarding started" done={Boolean(order.onboardingStartedAt)} detail={when(order.onboardingStartedAt)} />
          <Milestone label="Fulfillment complete" done={Boolean(order.fulfilledAt)} detail={when(order.fulfilledAt)} />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
        <h2 className="text-base font-bold text-white">Order notes</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">{order.notes || 'No fulfillment notes.'}</p>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) { return <div><div className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</div><div className="mt-1 break-words text-sm font-semibold text-gray-100">{value}</div></div>; }

function Milestone({ label, done, detail }: { label: string; done: boolean; detail: string }) {
  return <div className={`rounded-xl border p-4 ${done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-gray-700 bg-gray-900/30'}`}><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-500'}`}>{done ? '✓' : '·'}</span><div><div className={done ? 'text-sm font-bold text-gray-100' : 'text-sm font-bold text-gray-400'}>{label}</div><div className="mt-1 text-xs text-gray-500">{detail}</div></div></div></div>;
}

function StatusButton({ orderId, status, label }: { orderId: string; status: 'IMPLEMENTATION' | 'FULFILLED'; label: string }) {
  return <form action={updateOrderStatusAction} className="mt-4"><input type="hidden" name="orderId" value={orderId} /><input type="hidden" name="status" value={status} /><button type="submit" className="w-full rounded-xl border border-gray-700 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800">{label}</button></form>;
}
