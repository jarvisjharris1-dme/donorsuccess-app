import { Building2 } from 'lucide-react';
import { CrmProvider, Role } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { permissions } from '@/lib/permissions';
import { formatDateTime } from '@/lib/format';
import DisconnectSalesforceButton from './DisconnectSalesforceButton';
import SyncSalesforceButton from './SyncSalesforceButton';
import GivingHistoryFilterForm from './GivingHistoryFilterForm';
import ResyncSalesforceButton from './ResyncSalesforceButton';
import PurgeAndRebuildSalesforceForm from './PurgeAndRebuildSalesforceForm';

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'Salesforce integration isn\u2019t configured on the server yet — ask your admin to add the OAuth credentials.',
  missing_code_or_state: 'That connection attempt was incomplete — try again.',
  invalid_state: 'That connection link was invalid or expired — try again.',
  session_mismatch: 'You need to be logged in as the same user who started this connection.',
  token_exchange_failed: 'Could not complete the connection — try again, or check that the Connected App is configured correctly.',
  access_denied: 'You declined the permission request, so nothing was connected.',
};

export default async function SalesforceConnectionSection({
  connectedParam,
  errorParam,
}: {
  connectedParam?: string;
  errorParam?: string;
}) {
  const session = await auth();
  const canManage = permissions.canManageOrgSettings(session!.user.role as Role);

  // Raw `prisma` client — see the note on CrmConnection in
  // schema.prisma for why this doesn't go through forOrg().
  const [connection, organization] = await Promise.all([
    prisma.crmConnection.findUnique({
      where: {
        organizationId_provider: {
          organizationId: session!.user.organizationId,
          provider: CrmProvider.SALESFORCE,
        },
      },
    }),
    prisma.organization.findUnique({
      where: { id: session!.user.organizationId },
      select: { name: true },
    }),
  ]);

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Building2 size={16} className="text-gray-900" />
        <h2 className="text-[15px] font-bold text-gray-900">Salesforce</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Pulls Contacts and Opportunities into Donor Success as donors, pipeline, and gifts.
        Org-wide — one connection covers your whole team, unlike email integration which is
        per-fundraiser.
      </p>

      {connectedParam === '1' && (
        <p className="mt-3 rounded-lg bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">
          Connected successfully.
        </p>
      )}
      {errorParam && (
        <p className="mt-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
          {ERROR_MESSAGES[errorParam] ??
            `Something went wrong connecting Salesforce (error: ${errorParam}) — try again.`}
        </p>
      )}

      <div className="mt-4">
        {connection ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      connection.status === 'CONNECTED' ? 'bg-success' : 'bg-error'
                    }`}
                  />
                  <span className="text-sm font-semibold text-gray-900">{connection.instanceUrl}</span>
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {connection.lastSyncedAt
                    ? `Last synced ${formatDateTime(connection.lastSyncedAt)}`
                    : 'Never synced yet'}
                </div>
                {connection.status === 'ERROR' && connection.lastError && (
                  <div className="mt-1 text-xs text-error">{connection.lastError}</div>
                )}
              </div>
              {canManage && <DisconnectSalesforceButton />}
            </div>
            {canManage && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <SyncSalesforceButton />
              </div>
            )}
            {canManage && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <ResyncSalesforceButton />
              </div>
            )}
            {canManage && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <GivingHistoryFilterForm currentValue={connection.minGivingHistoryYears} />
              </div>
            )}
            {canManage && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <PurgeAndRebuildSalesforceForm organizationName={organization?.name ?? ''} />
              </div>
            )}
          </div>
        ) : canManage ? (
          <a
            href="/api/integrations/salesforce/connect"
            className="inline-block rounded-xl border border-gray-200 px-4 py-2.5 text-[13.5px] font-semibold text-gray-900 transition-colors hover:border-gray-300"
          >
            Connect Salesforce
          </a>
        ) : (
          <p className="text-sm text-gray-600">Ask an Admin to connect Salesforce.</p>
        )}
      </div>
    </div>
  );
}
