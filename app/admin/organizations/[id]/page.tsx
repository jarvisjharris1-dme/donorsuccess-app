import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { donorDisplayName } from '@/lib/format';
import MemberRoleSelect from '@/components/admin/MemberRoleSelect';
import DonorAssignSelect from '@/components/admin/DonorAssignSelect';
import InviteMemberForm from '@/components/admin/InviteMemberForm';
import AdminCrmSection, { type AdminCrmConnectionData } from '@/components/admin/AdminCrmSection';

const DONORS_PAGE_SIZE = 25;

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);

  // Raw `prisma` client throughout this page — see the note on
  // CrmConnection in schema.prisma and lib/actions/admin.ts for why
  // cross-organization reads/writes in this console deliberately don't
  // go through forOrg().
  const organization = await prisma.organization.findUnique({ where: { id: params.id } });
  if (!organization) notFound();

  const [members, donorCount, donors, crmConnection] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: params.id },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, email: true, role: true, isActive: true },
    }),
    prisma.donor.count({ where: { organizationId: params.id } }),
    prisma.donor.findMany({
      where: { organizationId: params.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * DONORS_PAGE_SIZE,
      take: DONORS_PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        organizationName: true,
        email: true,
        assignedToId: true,
      },
    }),
    prisma.crmConnection.findFirst({ where: { organizationId: params.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(donorCount / DONORS_PAGE_SIZE));

  return (
    <div>
      <Link
        href="/admin"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 hover:text-white"
      >
        <ArrowLeft size={14} />
        Organizations
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">{organization.name}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {organization.slug} &middot;{' '}
            <span className="capitalize">{organization.subscriptionTier.toLowerCase()}</span> &middot;{' '}
            {organization.timezone}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-[16px] border border-gray-800 bg-gray-800/40 p-6">
        <h2 className="text-[15px] font-bold text-white">Team</h2>
        <div className="mt-4">
          <InviteMemberForm organizationId={organization.id} />
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    No team members yet — the invite above will create the first one.
                  </td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 font-semibold text-white">{m.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{m.email}</td>
                  <td className="px-4 py-3">
                    <MemberRoleSelect
                      organizationId={organization.id}
                      userId={m.id}
                      currentRole={m.role}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        m.isActive ? 'bg-success/20 text-success' : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminCrmSection
        organizationId={organization.id}
        organizationName={organization.name}
        connection={
          crmConnection
            ? ({
                provider: crmConnection.provider,
                status: crmConnection.status,
                instanceUrl: crmConnection.instanceUrl,
                lastSyncedAt: crmConnection.lastSyncedAt ? crmConnection.lastSyncedAt.toISOString() : null,
                lastError: crmConnection.lastError,
                minGivingHistoryYears: crmConnection.minGivingHistoryYears,
              } satisfies AdminCrmConnectionData)
            : null
        }
      />

      <div className="mt-6 rounded-[16px] border border-gray-800 bg-gray-800/40 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-white">
            Donors <span className="font-normal text-gray-500">({donorCount})</span>
          </h2>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Donor</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {donors.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    No donors yet.
                  </td>
                </tr>
              )}
              {donors.map((donor) => (
                <tr key={donor.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 font-semibold text-white">{donorDisplayName(donor)}</td>
                  <td className="px-4 py-3 text-gray-400">{donor.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <DonorAssignSelect
                      organizationId={organization.id}
                      donorId={donor.id}
                      currentAssigneeId={donor.assignedToId}
                      members={members.filter((m) => m.isActive)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/admin/organizations/${organization.id}?page=${p}`}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
                  p === page ? 'bg-evergreen text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
