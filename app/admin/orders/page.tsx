import Link from 'next/link';
import { listOrders } from '@/lib/orders';
import CreateOrderForm from '@/components/admin/CreateOrderForm';

function money(cents: number | null) {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

function statusClasses(status: string) {
  if (status === 'FULFILLED') return 'bg-emerald-500/10 text-emerald-400';
  if (status === 'SIGNED' || status === 'READY_FOR_KICKOFF') return 'bg-teal/10 text-teal';
  if (status === 'VOIDED' || status === 'FAILED') return 'bg-red-500/10 text-red-400';
  return 'bg-amber-500/10 text-amber-300';
}

export default async function OrdersPage() {
  const orders = await listOrders();
  const open = orders.filter((o) => !['FULFILLED', 'VOIDED'].includes(o.status)).length;
  const signed = orders.filter((o) => ['SIGNED', 'PROVISIONING', 'READY_FOR_KICKOFF', 'IMPLEMENTATION', 'FULFILLED'].includes(o.status)).length;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-warning">Internal Operations</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Orders & Fulfillment</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">One operational queue for sales-assisted TurboSign orders and, next, Stripe self-service purchases.</p>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-gray-300 hover:text-white">← Admin home</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5"><div className="text-xs font-bold uppercase tracking-wide text-gray-500">Total Orders</div><div className="mt-2 text-3xl font-extrabold text-white">{orders.length}</div></div>
        <div className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5"><div className="text-xs font-bold uppercase tracking-wide text-gray-500">Open Fulfillment</div><div className="mt-2 text-3xl font-extrabold text-white">{open}</div></div>
        <div className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5"><div className="text-xs font-bold uppercase tracking-wide text-gray-500">Signed / Won</div><div className="mt-2 text-3xl font-extrabold text-white">{signed}</div></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-800/30">
        <div className="border-b border-gray-800 px-5 py-4"><h2 className="font-bold text-white">Fulfillment queue</h2></div>
        {orders.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">No orders yet. Create the first sales-assisted order below.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                <tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">ARR</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-800/40">
                    <td className="px-5 py-4"><Link href={`/admin/orders/${order.id}`} className="font-bold text-teal hover:text-white">{order.orderNumber}</Link><div className="mt-1 text-xs text-gray-500">{order.createdAt.toLocaleDateString()}</div></td>
                    <td className="px-5 py-4"><div className="font-semibold text-white">{order.organizationName}</div><div className="mt-1 text-xs text-gray-500">{order.ownerEmail}</div></td>
                    <td className="px-5 py-4 text-gray-300">{order.subscriptionTier}</td>
                    <td className="px-5 py-4 font-semibold text-white">{money(order.arrCents)}</td>
                    <td className="px-5 py-4 text-gray-300">{order.source}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasses(order.status)}`}>{order.status.replaceAll('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateOrderForm />
    </div>
  );
}
