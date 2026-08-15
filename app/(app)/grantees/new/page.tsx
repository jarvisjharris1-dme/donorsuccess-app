import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import GranteeForm from '@/components/allocations/GranteeForm';

export default async function NewGranteePage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (!hasGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_APPLICATIONS')) {
    redirect('/grantees');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Add grantee</h1>
      <p className="mt-1 text-sm text-gray-600">The agency profile applications will be filed against.</p>
      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <GranteeForm />
      </div>
    </div>
  );
}
