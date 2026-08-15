import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Lock } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import { getEnforcementState, GRACE_PERIOD_DAYS, DATA_DELETION_DAYS } from '@/lib/billing-policy';
import ManageBillingButton from '@/components/billing/ManageBillingButton';
import SignOutButton from '@/components/SignOutButton';
import Logo from '@/components/layout/Logo';
import SidebarNav from '@/components/layout/SidebarNav';
import MobileNavDrawer from '@/components/layout/MobileNavDrawer';
import PageHeaderTitle from '@/components/layout/PageHeaderTitle';
import DonorAvatar from '@/components/donors/DonorAvatar';
import SupportChatWidget from '@/components/support-chat/SupportChatWidget';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // The org name isn't on the JWT, so a lightweight lookup here keeps the
  // header accurate even if it changes — this is a good example of when
  // to still hit the DB despite having a session. Subscription fields
  // ride along in the same query rather than a second round-trip.
  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true, subscriptionStatus: true, subscriptionStatusChangedAt: true },
  });

  const enforcement = getEnforcementState(
    organization?.subscriptionStatus ?? null,
    organization?.subscriptionStatusChangedAt ?? null,
  );

  // Owner always sees every nav item regardless of configuration — see
  // the reasoning in prisma/schema.prisma on HiddenNavItem for why this
  // floor exists. Skipping the query entirely for Owner isn't just an
  // optimization; it's the actual guarantee.
  const hiddenNavHrefs =
    (session.user.role as Role) === Role.OWNER
      ? []
      : (
          await prisma.hiddenNavItem.findMany({
            where: { organizationId: session.user.organizationId, role: session.user.role as Role },
            select: { navHref: true },
          })
        ).map((h) => h.navHref);

  const displayName = session.user.name ?? session.user.email ?? 'User';

  // Locked accounts see the same restricted screen on every route under
  // this layout — the fix action (Manage Billing) lives right here, so
  // there's no need to special-case letting Settings itself through.
  if (enforcement.isLocked) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 sm:px-6">
          <Logo />
          <SignOutButton />
        </header>
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-[16px] border border-gray-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
              <Lock size={24} className="text-error" />
            </div>
            <h1 className="mt-4 text-xl font-extrabold text-gray-900">Account restricted</h1>
            <p className="mt-2 text-[14px] text-gray-600">
              {organization?.name ?? 'Your organization'}&rsquo;s subscription needs attention, and the{' '}
              {GRACE_PERIOD_DAYS}-day grace period has passed. Fix billing to restore access
              immediately &mdash; your data is safe and will be retained for {DATA_DELETION_DAYS} days
              total from when the issue started before any deletion.
            </p>
            <div className="mt-6 flex justify-center">
              <ManageBillingButton />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-6 sm:flex">
        <div className="px-2">
          <Logo />
        </div>

        <SidebarNav hiddenHrefs={hiddenNavHrefs} />

        <div className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 p-2.5">
          <DonorAvatar name={displayName} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-gray-900">{displayName}</div>
            <span className="mt-0.5 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-gray-600">
              {session.user.role.toLowerCase()}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 sm:px-6">
          <div className="flex items-center gap-3">
            <MobileNavDrawer hiddenHrefs={hiddenNavHrefs} />
            <PageHeaderTitle organizationName={organization?.name ?? 'Your organization'} />
          </div>
          <div className="flex items-center gap-4 sm:gap-5">
            {session.user.isPlatformAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-[12.5px] font-semibold text-warning transition-colors hover:bg-warning/20"
              >
                <ShieldAlert size={13} />
                Admin Console
              </Link>
            )}
            <span className="hidden text-[13px] text-gray-600 md:inline">{session.user.email}</span>
            <div className="h-5 w-px bg-gray-200" />
            <SignOutButton />
          </div>
        </header>
        {enforcement.inGracePeriod && (
          <div className="flex items-center justify-between gap-3 bg-warning/10 px-5 py-2.5 text-[13px] sm:px-8">
            <span className="text-gray-900">
              There&rsquo;s an issue with your subscription &mdash; fix it within{' '}
              {Math.max(0, Math.ceil(GRACE_PERIOD_DAYS - (enforcement.daysSinceStatusChange ?? 0)))} day
              {Math.ceil(GRACE_PERIOD_DAYS - (enforcement.daysSinceStatusChange ?? 0)) === 1 ? '' : 's'} to
              avoid losing access.
            </span>
            <Link href="/settings" className="flex-shrink-0 font-semibold text-evergreen hover:text-[#0d685f]">
              Fix now →
            </Link>
          </div>
        )}
        <main className="flex-1 p-5 sm:p-8">{children}</main>
      </div>
      <SupportChatWidget />
    </div>
  );
}
