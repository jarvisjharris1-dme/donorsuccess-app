import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import GiftImportWizard from '@/components/import/GiftImportWizard';

export const maxDuration = 60;

export default async function GiftImportPage() {
  const session = await auth();
  if (!permissions.canDeleteRecords(session!.user.role as Role)) {
    redirect('/donors');
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/donors/import"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Import
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Import gift history</h1>
      <p className="mt-1 text-sm text-gray-600">
        Upload a gift/transaction export and attach it to donors already in your organization,
        matched by email. Import donors first if they aren&rsquo;t in the system yet.
      </p>

      <div className="mt-6">
        <GiftImportWizard />
      </div>
    </div>
  );
}
