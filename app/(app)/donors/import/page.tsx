import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, Gift, ArrowRight } from 'lucide-react';
import { auth } from '@/auth';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';

export default async function ImportChooserPage() {
  const session = await auth();
  if (!permissions.canDeleteRecords(session!.user.role as Role)) {
    redirect('/donors');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Import data</h1>
      <p className="mt-1 text-sm text-gray-600">
        Bring in donor records, gift history, or both — from any CRM export or spreadsheet.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/donors/import/donors"
          className="group flex flex-col rounded-[16px] border border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-card"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-evergreen/10">
            <Users size={20} className="text-evergreen" />
          </div>
          <h2 className="mt-4 text-[16px] font-bold text-gray-900">Import donors</h2>
          <p className="mt-1.5 text-sm text-gray-600">
            Bring in donor records — names, contact info, and a giving snapshot.
          </p>
          <span className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-evergreen">
            Start here first
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/donors/import/gifts"
          className="group flex flex-col rounded-[16px] border border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-card"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-sky/10">
            <Gift size={20} className="text-sky" />
          </div>
          <h2 className="mt-4 text-[16px] font-bold text-gray-900">Import gift history</h2>
          <p className="mt-1.5 text-sm text-gray-600">
            Attach individual gift transactions to donors already in your organization.
          </p>
          <span className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-sky">
            Requires donors to already exist
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
