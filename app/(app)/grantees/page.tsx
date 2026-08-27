import Link from 'next/link';
import { Plus } from 'lucide-react';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import { formatCurrency } from '@/lib/format';

export default async function GranteesPage() {
  const session = await auth();
  const db = forOrg(session!.user.organizationId);
  const canCreate = hasGrantCapability(
    session!.user.role as Role,
    session!.user.grantRole as GrantRole | null,
    'MANAGE_APPLICATIONS',
  );

  const grantees = await db.grantee.findMany({
    orderBy: { legalName: 'asc' },
    include: { applications: { select: { id: true } } },
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Grantees</h1>
          <p className="mt-1 text-sm text-gray-600">Agencies your organization funds through pooled programs.</p>
        </div>
        {canCreate && (
          <Link
            href="/grantees/new"
            className="flex items-center gap-2 rounded-xl bg-evergreen px-5 py-3 text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#0d685f]"
          >
            <Plus size={16} />
            Add grantee
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {grantees.length === 0 && (
          <div className="rounded-[16px] border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
            No grantees yet.
          </div>
        )}
        {grantees.map((g) => (
          <Link
            key={g.id}
            href={`/grantees/${g.id}`}
            className="flex items-center gap-4 rounded-[16px] border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-gray-900">{g.legalName}</p>
              <p className="mt-0.5 text-[13px] text-gray-600">
                {g.applications.length} application{g.applications.length === 1 ? '' : 's'}
                {g.ein ? ` · EIN ${g.ein}` : ''}
              </p>
            </div>
            <p className="flex-shrink-0 text-[13px] text-gray-500">
              Lifetime awarded {formatCurrency(g.lifetimeAwarded.toString())}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
