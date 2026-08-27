import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { getCommunityBranding } from '@/lib/community-portal';
import CommunityBrandingForm from '@/components/settings/CommunityBrandingForm';
import Logo from '@/components/layout/Logo';

export default async function CommunityPortalSettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const canManage = permissions.canManageOrgSettings(session.user.role as Role) || session.user.isPlatformAdmin;
  if (!canManage) redirect('/settings');

  const branding = await getCommunityBranding(session.user.organizationId);
  if (!branding) redirect('/settings');

  return (
    <div className="max-w-4xl">
      <Link href="/settings" className="text-sm font-semibold text-evergreen hover:text-[#0d685f]">← Back to settings</Link>
      <div className="mt-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Community Portal branding</h1>
        <p className="mt-1 text-sm text-gray-600">
          Co-brand public funding opportunities with your organization while keeping Donor Success visible as the platform powering the experience.
        </p>
      </div>

      <div className="mt-8 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Funding organization logo</h2>
        <p className="mt-1 text-sm text-gray-600">This logo appears at the top of every public funding opportunity and applicant portal page.</p>
        <div className="mt-5">
          <CommunityBrandingForm logoUrl={branding.logoUrl} organizationName={branding.organizationName} />
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Public portal preview</h2>
        <div className="mt-4 rounded-2xl border border-gray-200 bg-[#f8faf9] p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt={`${branding.organizationName} logo`} className="max-h-14 max-w-[220px] object-contain" />
              ) : (
                <p className="text-lg font-extrabold text-gray-900">{branding.organizationName}</p>
              )}
            </div>
            <div className="flex items-center gap-3 border-t border-gray-200 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <span className="text-[11px] font-bold uppercase tracking-[.16em] text-gray-400">Powered by</span>
              <Logo height={28} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
