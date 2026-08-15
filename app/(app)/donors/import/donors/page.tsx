import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import ImportWizard from '@/components/import/ImportWizard';

// Bulk imports can take a little longer than a typical request —
// extends the timeout budget available on Vercel (up to what the plan
// allows; see the note in lib/actions/import.ts about why health
// scoring isn't computed inline here too).
export const maxDuration = 60;

export default async function DonorImportPage() {
  const session = await auth();
  if (!permissions.canDeleteRecords(session!.user.role as Role)) {
    // Bulk-creating hundreds/thousands of donor records is a bigger-
    // consequence operation than editing one donor, so this is gated at
    // the same Admin+ tier as deletion rather than the FUNDRAISER tier
    // regular donor edits use.
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

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">Import donors</h1>
      <p className="mt-1 text-sm text-gray-600">
        Upload a CSV export from your previous CRM or spreadsheet — works with exports from
        Salesforce, HubSpot, Blackbaud, StratusLive, Andar, or any tool that can export to CSV.
      </p>

      <div className="mt-6">
        <ImportWizard />
      </div>
    </div>
  );
}
