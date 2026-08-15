import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import FundingRoundForm from '@/components/allocations/FundingRoundForm';

export default async function NewFundingRoundPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (
    !hasGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FUNDING_ROUNDS')
  ) {
    redirect('/funding-rounds');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">New funding round</h1>
      <p className="mt-1 text-sm text-gray-600">Set up the pool, service categories, and scoring rubric.</p>
      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <FundingRoundForm />
      </div>
    </div>
  );
}
