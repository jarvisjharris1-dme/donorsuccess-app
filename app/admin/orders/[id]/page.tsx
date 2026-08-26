import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/orders';
import { provisionOrderAction, updateOrderStatusAction } from '@/lib/actions/orders';

function money(cents: number | null) {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const products = order.productsJson ? (JSON.parse(order.productsJson) as string[]) : [];
  const canProvision = ['SIGNED', 'FAILED'].includes(order.status) && !order.organizationId;

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

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5 lg:col-span-2">
          <h2 className="text-base font-bold text-white">Commercial summary</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Plan" value={order.subscriptionTier} />
            <Field label="Billing" value={order.billingPeriod ?? '—'} />
            <Field label="ARR" value={money(order.arrCents)} />
            <Field label="One-time" value={money(order.oneTimeCents)} />
            <Field label="TurboQuote" value={order.quoteId ?? '—'} />
            <Field label="TurboSign document" value={order.turboSignDocumentId ?? '—'} />
          </div>
          <div className="mt-5 border-t border-gray-800 pt-5">
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Products / Modules</div>
            <div className="mt-2 flex flex-wrap gap-2">{products.length ? products.map((p) => <span key={p} className="rounded-full bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-200">{p}</span>) : <span className="text-sm text-gray-500">No product details added.</span>}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
          <h2 className="text-base font-bold text-white">Fulfillment</h2>
          <div className="mt-5 space-y-4">
            <Step label="Agreement signed" done={Boolean(order.signedAt)} />
            <Step label="Organization provisioned" done={Boolean(order.organizationId)} />
            <Step label="Owner invitation sent" done={Boolean(order.provisionedAt)} />
            <Step label="Ready for kickoff" done={['READY_FOR_KICKOFF', 'IMPLEMENTATION', 'FULFILLED'].includes(order.status)} />
            <Step label="Implementation complete" done={order.status === 'FULFILLED'} />
          </div>

          {canProvision && (
            <form action={provisionOrderAction} className="mt-6">
              <input type="hidden" name="orderId" value={order.id} />
              <button type="submit" className="w-full rounded-xl bg-evergreen px-4 py-3 text-sm font-bold text-white hover:bg-[#0d685f]">Provision Customer</button>
            </form>
          )}

          {order.organizationId && order.status === 'READY_FOR_KICKOFF' && (
            <StatusButton orderId={order.id} status="IMPLEMENTATION" label="Start Implementation" />
          )}
          {order.status === 'IMPLEMENTATION' && (
            <StatusButton orderId={order.id} status="FULFILLED" label="Mark Fulfilled" />
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
        <h2 className="text-base font-bold text-white">Order notes</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">{order.notes || 'No fulfillment notes.'}</p>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</div><div className="mt-1 break-words text-sm font-semibold text-gray-100">{value}</div></div>;
}

function Step({ label, done }: { label: string; done: boolean }) {
  return <div className="flex items-center gap-3"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-500'}`}>{done ? '✓' : '·'}</span><span className={done ? 'text-sm font-semibold text-gray-200' : 'text-sm text-gray-500'}>{label}</span></div>;
}

function StatusButton({ orderId, status, label }: { orderId: string; status: 'IMPLEMENTATION' | 'FULFILLED'; label: string }) {
  return <form action={updateOrderStatusAction} className="mt-4"><input type="hidden" name="orderId" value={orderId} /><input type="hidden" name="status" value={status} /><button type="submit" className="w-full rounded-xl border border-gray-700 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800">{label}</button></form>;
}
