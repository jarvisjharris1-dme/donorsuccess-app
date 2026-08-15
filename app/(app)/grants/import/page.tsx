import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { hasGrantCapability } from '@/lib/grant-permissions';
import { Role, GrantRole } from '@prisma/client';
import GrantImportWizard from '@/components/import/GrantImportWizard';

export const maxDuration = 60;

export default async function GrantImportPage() {
  const session = await auth();
  if (
    !hasGrantCapability(
      session!.user.role as Role,
      session!.user.grantRole as GrantRole | null,
      'MANAGE_OPPORTUNITIES',
    )
  ) {
    redirect('/grants');
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/grants"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Grant opportunities
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Import grants</h1>
      <p className="mt-1 text-sm text-gray-600">
        Bring in grant opportunities from a spreadsheet export of whatever system you&rsquo;re
        migrating from — Fluxx, Foundant, GrantFrog, or just a spreadsheet you&rsquo;ve been
        tracking things in.
      </p>

      <div className="mt-6">
        <GrantImportWizard />
      </div>
    </div>
  );
}
