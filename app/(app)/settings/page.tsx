import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import OrgProfileForm from '@/components/settings/OrgProfileForm';
import InviteForm from '@/components/settings/InviteForm';
import PendingInvitations, { type InvitationRow } from '@/components/settings/PendingInvitations';
import TeamMemberRow, { type MemberRow } from '@/components/settings/TeamMemberRow';
import ProfileForm from '@/components/settings/ProfileForm';
import RecalculateAllButton from '@/components/settings/RecalculateAllButton';
import PendingPasswordResets, { type PendingResetRow } from '@/components/settings/PendingPasswordResets';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';
import EmailConnectionSection from '@/components/settings/EmailConnectionSection';
import SalesforceConnectionSection from '@/components/settings/SalesforceConnectionSection';
import VolunteerRateForm from '@/components/settings/VolunteerRateForm';
import WealthEngineConnectionSection from '@/components/settings/WealthEngineConnectionSection';
import LoadStarterContentButton from '@/components/settings/LoadStarterContentButton';
import BillingSection from '@/components/settings/BillingSection';

// The manual "Sync Now" button runs a server action from this page —
// extends the timeout budget available to it (same reasoning as the
// import wizard pages).
export const maxDuration = 60;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: {
    email_connected?: string;
    email_error?: string;
    salesforce_connected?: string;
    salesforce_error?: string;
  };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  // Settings is reachable by every logged-in role — it's just that
  // most sections on it are Admin+ only (org profile, team, Salesforce/
  // WealthEngine connections). "Change your password" and "Email
  // integration" are personal, not organizational, so every role needs
  // to reach this page even though they can't see most of what's on it.
  const canManage = permissions.canManageOrgSettings(session.user.role as Role);
  const db = forOrg(session.user.organizationId);

  const [organization, currentUser, members, invitations, wealthEngineConnection] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: session.user.organizationId },
      select: {
        name: true,
        timezone: true,
        subscriptionTier: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        volunteerHourlyRate: true,
        billingPeriod: true,
      },
    }),
    // Same reasoning as the org name above: the JWT session only carries
    // the name from sign-in time, so this page reads the live value
    // rather than trusting session.user.name.
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { name: true },
    }),
    // Only Admin+ sections (Team, Pending resets) actually need the
    // member list — skip it for everyone else rather than run a query
    // whose result never renders.
    canManage
      ? db.user.findMany({
          orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
          select: { id: true, name: true, email: true, role: true, grantRole: true, isActive: true },
        })
      : Promise.resolve([]),
    canManage
      ? db.invitation.findMany({
          where: { acceptedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { id: true, email: true, role: true, token: true, expiresAt: true },
        })
      : Promise.resolve([]),
    db.wealthEngineConnection.findFirst({ select: { baseUrl: true } }),
  ]);

  // VerificationToken isn't tenant-scoped (it has no organizationId column
  // — see prisma/schema.prisma), so this uses the raw client, filtered
  // down to just this org's member emails. Only relevant for Admin+.
  const pendingResets: PendingResetRow[] = canManage
    ? await (async () => {
        const tokens = await prisma.verificationToken.findMany({
          where: {
            identifier: { in: members.map((m) => m.email) },
            expires: { gt: new Date() },
          },
        });
        return tokens.map((t) => {
          const member = members.find((m) => m.email === t.identifier);
          return { token: t.token, name: member?.name ?? null, email: t.identifier };
        });
      })()
    : [];

  const memberRows: MemberRow[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    grantRole: m.grantRole,
    isActive: m.isActive,
    isSelf: m.id === session.user.id,
  }));

  const invitationRows: InvitationRow[] = invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    token: inv.token,
    expiresAt: inv.expiresAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">
        {canManage ? 'Organization profile and team management.' : 'Your personal account settings.'}
      </p>

      {canManage && (
        <>
          <div className="mt-8 rounded-[16px] border border-gray-200 bg-white p-6">
            <h2 className="text-[15px] font-bold text-gray-900">Organization</h2>
            <div className="mt-4">
              <OrgProfileForm organization={organization} />
            </div>
          </div>

          <div className="mt-6">
            <BillingSection
              tier={organization.subscriptionTier}
              billingPeriod={organization.billingPeriod}
              subscriptionStatus={organization.subscriptionStatus}
              isSelfServe={!!organization.stripeCustomerId}
            />
          </div>

          <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
            <h2 className="text-[15px] font-bold text-gray-900">Invite a teammate</h2>
            <div className="mt-4">
              <InviteForm />
            </div>
            <div className="mt-3">
              <Link
                href="/settings/import-team"
                className="text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
              >
                Or import several teammates at once from a CSV →
              </Link>
            </div>
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-gray-600">
                Pending invitations
              </h3>
              <div className="mt-2">
                <PendingInvitations invitations={invitationRows} />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[16px] border border-gray-200 bg-white">
            <div className="p-6 pb-0">
              <h2 className="text-[15px] font-bold text-gray-900">Team</h2>
            </div>
            <div className="mt-4 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-5 py-3.5">Member</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Grant role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {memberRows.map((m) => (
                    <TeamMemberRow
                      key={m.id}
                      member={m}
                      canManage
                      currentUserRole={session.user.role as Role}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
            <h2 className="text-[15px] font-bold text-gray-900">Pending password resets</h2>
            <p className="mt-1 text-sm text-gray-600">
              Reset emails are sent automatically when someone requests one from the login page.
              This list is a fallback — copy a link directly if an email doesn&rsquo;t arrive.
            </p>
            <div className="mt-3">
              <PendingPasswordResets resets={pendingResets} />
            </div>
          </div>

          <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
            <h2 className="text-[15px] font-bold text-gray-900">Data &amp; scoring</h2>
            <p className="mt-1 text-sm text-gray-600">
              Donor health scores recalculate automatically whenever a gift or interaction is logged,
              and nightly for every donor (so scores stay current even for donors with no recent
              activity). Trigger a manual recalculation now if you don&rsquo;t want to wait for the
              nightly run.
            </p>
            <div className="mt-4">
              <RecalculateAllButton />
            </div>
          </div>
        </>
      )}

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Your profile</h2>
        <p className="mt-1 text-sm text-gray-600">Just your display name — no one else&rsquo;s.</p>
        <div className="mt-4">
          <ProfileForm currentName={currentUser.name} />
        </div>
      </div>

      <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6">
        <h2 className="text-[15px] font-bold text-gray-900">Change your password</h2>
        <p className="mt-1 text-sm text-gray-600">Updates your own login — no one else&rsquo;s.</p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>

      <div className="mt-6">
        <EmailConnectionSection
          connectedParam={searchParams.email_connected}
          errorParam={searchParams.email_error}
        />
        {canManage && (
          <div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6">
            <h2 className="text-[15px] font-bold text-gray-900">Email templates</h2>
            <p className="mt-1 text-sm text-gray-600">
              Shared, reusable messages fundraisers can send to donors — tag one to a retention risk
              tier or a campaign to have it suggested automatically when composing.
            </p>
            <Link
              href="/settings/email-templates"
              className="mt-4 inline-block text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
            >
              Manage email templates →
            </Link>
          </div>
        )}
      </div>

      {canManage && (
        <div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Success sequences</h2>
          <p className="mt-1 text-sm text-gray-600">
            Reusable, multi-step stewardship playbooks — every step still requires a fundraiser to
            click Send.
          </p>
          <Link
            href="/settings/sequence-templates"
            className="mt-4 inline-block text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
          >
            Manage success sequences →
          </Link>
          <div className="mt-5 border-t border-gray-100 pt-5">
            <p className="mb-3 text-[13px] text-gray-600">
              New here or starting fresh? Preload a set of ready-to-use email templates and
              sequences rather than starting from a blank slate.
            </p>
            <LoadStarterContentButton />
          </div>
        </div>
      )}

      {canManage && (
        <div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Success Plan templates</h2>
          <p className="mt-1 text-sm text-gray-600">
            Reusable milestone structures a fundraiser can apply to a new plan instead of building
            one from scratch.
          </p>
          <Link
            href="/settings/plan-templates"
            className="mt-4 inline-block text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
          >
            Manage plan templates →
          </Link>
        </div>
      )}

      {canManage && (
        <div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Navigation</h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose which sections of the app each role can see in the main navigation.
          </p>
          <Link
            href="/settings/navigation"
            className="mt-4 inline-block text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
          >
            Manage navigation →
          </Link>
        </div>
      )}

      {canManage && (
        <div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6">
          <h2 className="text-[15px] font-bold text-gray-900">Volunteer Hour Rate</h2>
          <VolunteerRateForm
            currentOverride={organization.volunteerHourlyRate ? organization.volunteerHourlyRate.toString() : null}
          />
        </div>
      )}

      {canManage && (
        <>
          <div className="mt-6">
            <SalesforceConnectionSection
              connectedParam={searchParams.salesforce_connected}
              errorParam={searchParams.salesforce_error}
            />
          </div>

          <div className="mt-6">
            <WealthEngineConnectionSection
              isConnected={!!wealthEngineConnection}
              baseUrl={wealthEngineConnection?.baseUrl ?? null}
              canManage={canManage}
            />
          </div>
        </>
      )}
    </div>
  );
}
