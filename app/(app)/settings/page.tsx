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
import RecalculateAllButton from '@/components/settings/RecalculateAllButton';
import PendingPasswordResets, { type PendingResetRow } from '@/components/settings/PendingPasswordResets';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';
import EmailConnectionSection from '@/components/settings/EmailConnectionSection';
import SalesforceConnectionSection from '@/components/settings/SalesforceConnectionSection';
import VolunteerRateForm from '@/components/settings/VolunteerRateForm';
import WealthEngineConnectionSection from '@/components/settings/WealthEngineConnectionSection';
import LoadStarterContentButton from '@/components/settings/LoadStarterContentButton';
import BillingSection from '@/components/settings/BillingSection';
import CommunityBrandingForm from '@/components/settings/CommunityBrandingForm';
import UserProfileForm from '@/components/settings/UserProfileForm';
import { getCommunityBranding } from '@/lib/community-portal';

export const maxDuration = 60;

export default async function SettingsPage({ searchParams }: { searchParams: { email_connected?: string; email_error?: string; salesforce_connected?: string; salesforce_error?: string } }) {
  const session = await auth();
  if (!session) redirect('/login');
  const canManage = permissions.canManageOrgSettings(session.user.role as Role);
  const db = forOrg(session.user.organizationId);
  const [organization, members, invitations, wealthEngineConnection, currentUser, branding] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: session.user.organizationId }, select: { name: true, timezone: true, subscriptionTier: true, stripeCustomerId: true, subscriptionStatus: true, volunteerHourlyRate: true, billingPeriod: true } }),
    canManage ? db.user.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }], select: { id: true, name: true, email: true, role: true, grantRole: true, isActive: true } }) : Promise.resolve([]),
    canManage ? db.invitation.findMany({ where: { acceptedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, role: true, token: true, expiresAt: true } }) : Promise.resolve([]),
    db.wealthEngineConnection.findFirst({ select: { baseUrl: true } }),
    db.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
    canManage ? getCommunityBranding(session.user.organizationId).catch(() => null) : Promise.resolve(null),
  ]);
  const pendingResets: PendingResetRow[] = canManage ? await (async () => { const tokens = await prisma.verificationToken.findMany({ where: { identifier: { in: members.map((m) => m.email) }, expires: { gt: new Date() } } }); return tokens.map((t) => { const member = members.find((m) => m.email === t.identifier); return { token: t.token, name: member?.name ?? null, email: t.identifier }; }); })() : [];
  const memberRows: MemberRow[] = members.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role, grantRole: m.grantRole, isActive: m.isActive, isSelf: m.id === session.user.id }));
  const invitationRows: InvitationRow[] = invitations.map((inv) => ({ id: inv.id, email: inv.email, role: inv.role, token: inv.token, expiresAt: inv.expiresAt.toISOString() }));
  return <div className="max-w-4xl">
    <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1><p className="mt-1 text-sm text-gray-600">{canManage ? 'Organization profile and team management.' : 'Your personal account settings.'}</p>
    <div className="mt-8 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Your profile</h2><p className="mt-1 text-sm text-gray-600">Update the name displayed across Donor Success.</p><div className="mt-4"><UserProfileForm name={currentUser?.name ?? ''} email={currentUser?.email ?? session.user.email ?? ''} /></div></div>
    {canManage && <><div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Organization</h2><div className="mt-4"><OrgProfileForm organization={organization} /></div></div>
    <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-[15px] font-bold text-gray-900">Organization logo</h2><p className="mt-1 text-sm text-gray-600">Upload the logo used for your organization and Community Portal.</p></div><Link href="/settings/community-portal" className="text-[13px] font-semibold text-evergreen">Portal preview →</Link></div><div className="mt-4">{branding ? <CommunityBrandingForm logoUrl={branding.logoUrl} organizationName={branding.organizationName} /> : <p className="text-sm text-gray-500">Logo settings will be available after the Community Portal database update completes.</p>}</div></div>
    <div className="mt-6"><BillingSection tier={organization.subscriptionTier} billingPeriod={organization.billingPeriod} subscriptionStatus={organization.subscriptionStatus} isSelfServe={!!organization.stripeCustomerId} /></div>
    <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Invite a teammate</h2><div className="mt-4"><InviteForm /></div><div className="mt-3"><Link href="/settings/import-team" className="text-[13px] font-semibold text-evergreen">Or import several teammates at once from a CSV →</Link></div><div className="mt-6 border-t border-gray-100 pt-4"><h3 className="text-[13px] font-bold uppercase tracking-wide text-gray-600">Pending invitations</h3><div className="mt-2"><PendingInvitations invitations={invitationRows} /></div></div></div>
    <div className="mt-6 rounded-[16px] border border-gray-200 bg-white"><div className="p-6 pb-0"><h2 className="text-[15px] font-bold text-gray-900">Team</h2></div><div className="mt-4 overflow-hidden"><table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600"><th className="px-5 py-3.5">Member</th><th className="px-5 py-3.5">Role</th><th className="px-5 py-3.5">Grant role</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5"></th></tr></thead><tbody>{memberRows.map((m) => <TeamMemberRow key={m.id} member={m} canManage currentUserRole={session.user.role as Role} />)}</tbody></table></div></div>
    <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Pending password resets</h2><p className="mt-1 text-sm text-gray-600">Reset emails are sent automatically when someone requests one from the login page.</p><div className="mt-3"><PendingPasswordResets resets={pendingResets} /></div></div>
    <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Data &amp; scoring</h2><p className="mt-1 text-sm text-gray-600">Donor health scores recalculate automatically. Trigger a manual recalculation when needed.</p><div className="mt-4"><RecalculateAllButton /></div></div></>}
    <div className="mt-6 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Change your password</h2><p className="mt-1 text-sm text-gray-600">Updates your own login — no one else&rsquo;s.</p><div className="mt-4"><ChangePasswordForm /></div></div>
    <div className="mt-6"><EmailConnectionSection connectedParam={searchParams.email_connected} errorParam={searchParams.email_error} />{canManage && <div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Email templates</h2><p className="mt-1 text-sm text-gray-600">Shared, reusable messages fundraisers can send to donors.</p><Link href="/settings/email-templates" className="mt-4 inline-block text-[13px] font-semibold text-evergreen">Manage email templates →</Link></div>}</div>
    {canManage && <><div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Success sequences</h2><p className="mt-1 text-sm text-gray-600">Reusable, multi-step stewardship playbooks.</p><Link href="/settings/sequence-templates" className="mt-4 inline-block text-[13px] font-semibold text-evergreen">Manage success sequences →</Link><div className="mt-5 border-t border-gray-100 pt-5"><LoadStarterContentButton /></div></div>
    <div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Success Plan templates</h2><Link href="/settings/plan-templates" className="mt-4 inline-block text-[13px] font-semibold text-evergreen">Manage plan templates →</Link></div>
    <div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Navigation</h2><Link href="/settings/navigation" className="mt-4 inline-block text-[13px] font-semibold text-evergreen">Manage navigation →</Link></div>
    <div className="mt-3 rounded-[16px] border border-gray-200 bg-white p-6"><h2 className="text-[15px] font-bold text-gray-900">Volunteer Hour Rate</h2><VolunteerRateForm currentOverride={organization.volunteerHourlyRate ? organization.volunteerHourlyRate.toString() : null} /></div>
    <div className="mt-6"><SalesforceConnectionSection connectedParam={searchParams.salesforce_connected} errorParam={searchParams.salesforce_error} /></div><div className="mt-6"><WealthEngineConnectionSection isConnected={!!wealthEngineConnection} baseUrl={wealthEngineConnection?.baseUrl ?? null} canManage={canManage} /></div></>}
  </div>;
}
