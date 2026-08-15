import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import TeamImportWizard from '@/components/import/TeamImportWizard';

// Bulk imports (and the invitation emails sent at the end) can take a
// little longer than a typical request — same reasoning as the donor
// import page.
export const maxDuration = 60;

export default async function TeamImportPage() {
  const session = await auth();
  if (!permissions.canManageOrgSettings(session!.user.role as Role)) {
    redirect('/settings');
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/settings"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Settings
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Import teammates</h1>
      <p className="mt-1 text-sm text-gray-600">
        Upload a CSV with Name, Email, and Role columns to invite several teammates at once. Each
        person gets a real invitation email — the same as inviting one at a time from Settings, just
        in bulk.
      </p>

      <div className="mt-6">
        <TeamImportWizard />
      </div>
    </div>
  );
}
