import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CreateOrganizationForm from '@/components/admin/CreateOrganizationForm';

export default function NewOrganizationPage() {
  return (
    <div className="max-w-xl">
      <Link
        href="/admin"
        className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 hover:text-white"
      >
        <ArrowLeft size={14} />
        Organizations
      </Link>

      <h1 className="mt-2 text-2xl font-extrabold text-white">New customer</h1>
      <p className="mt-1 text-sm text-gray-400">
        Creates the organization and generates an invite link for their first Owner — send them
        that link to have them set their own password and log in.
      </p>

      <div className="mt-6">
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
