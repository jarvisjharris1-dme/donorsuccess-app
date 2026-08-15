import Link from 'next/link';
import { Plus, Building2 } from 'lucide-react';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';

export default async function AdminOrganizationsPage() {
  // Raw `prisma` client, deliberately — this page's entire purpose is a
  // cross-organization view, which is exactly what forOrg() exists to
  // prevent everywhere else. Access to this page itself is already
  // gated to isPlatformAdmin by the layout and middleware.
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, donors: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Organizations</h1>
          <p className="mt-1 text-sm text-gray-400">
            {organizations.length} customer{organizations.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/admin/organizations/new"
          className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
        >
          <Plus size={16} />
          New Customer
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-[16px] border border-gray-800 bg-gray-800/40">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3.5">Organization</th>
              <th className="px-5 py-3.5">Tier</th>
              <th className="px-5 py-3.5">Team</th>
              <th className="px-5 py-3.5">Donors</th>
              <th className="px-5 py-3.5">Created</th>
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">
                  No customer organizations yet.
                </td>
              </tr>
            )}
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                <td className="px-5 py-3.5">
                  <Link href={`/admin/organizations/${org.id}`} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-evergreen/20">
                      <Building2 size={15} className="text-evergreen" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{org.name}</div>
                      <div className="text-xs text-gray-500">{org.slug}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <span className="rounded-full bg-gray-800 px-2.5 py-1 text-[11px] font-semibold capitalize text-gray-300">
                    {org.subscriptionTier.toLowerCase()}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-300">{org._count.users}</td>
                <td className="px-5 py-3.5 text-gray-300">{org._count.donors}</td>
                <td className="px-5 py-3.5 text-gray-400">{formatDate(org.createdAt.toISOString())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
