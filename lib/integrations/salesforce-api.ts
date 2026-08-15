import { CrmProvider, CrmConnectionStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { refreshAccessToken } from './salesforce';

const API_VERSION = 'v60.0';

export type SalesforceSession = {
  accessToken: string;
  instanceUrl: string;
};

/**
 * Resolves a valid Salesforce session for an org, refreshing and
 * persisting a new access token first if needed — same pattern as
 * lib/integrations/email-send.ts's getValidAccessToken, just
 * per-organization instead of per-user (Salesforce is the one CRM
 * connection that's org-wide, not per-fundraiser — see the note on
 * CrmConnection in schema.prisma).
 */
export async function getValidSalesforceSession(
  organizationId: string,
): Promise<SalesforceSession> {
  const connection = await prisma.crmConnection.findUnique({
    where: { organizationId_provider: { organizationId, provider: CrmProvider.SALESFORCE } },
  });
  if (!connection) {
    throw new Error('Salesforce is not connected for this organization.');
  }
  if (!connection.instanceUrl) {
    throw new Error('Salesforce connection is missing its instance URL — reconnect in Settings.');
  }

  const isExpired = !connection.tokenExpiresAt || connection.tokenExpiresAt < new Date();
  if (!isExpired) {
    return {
      accessToken: decryptToken(connection.accessTokenEncrypted),
      instanceUrl: connection.instanceUrl,
    };
  }

  if (!connection.refreshTokenEncrypted) {
    await prisma.crmConnection.update({
      where: { id: connection.id },
      data: {
        status: CrmConnectionStatus.ERROR,
        lastError: 'Access token expired with no refresh token available.',
      },
    });
    throw new Error('Salesforce connection has expired and can\u2019t be refreshed — reconnect in Settings.');
  }

  const refreshToken = decryptToken(connection.refreshTokenEncrypted);
  const refreshed = await refreshAccessToken(refreshToken);

  // Salesforce access tokens from the refresh grant don't include an
  // expires_in — they're valid until explicitly revoked or the org's
  // session policy expires them, so there's no reliable expiry to
  // store. Re-check (and re-refresh on a 401) rather than trusting a
  // guessed TTL.
  await prisma.crmConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEncrypted: encryptToken(refreshed.access_token),
      tokenExpiresAt: null,
      status: CrmConnectionStatus.CONNECTED,
      lastError: null,
    },
  });

  return { accessToken: refreshed.access_token, instanceUrl: connection.instanceUrl };
}

type SoqlResponse<T> = {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
};

/**
 * Runs a SOQL query, following pagination automatically (Salesforce
 * caps a single response at 2,000 records) until all pages are
 * fetched. Retries once with a refreshed token on a 401, in case the
 * token was invalidated between getValidSalesforceSession() resolving
 * it and this call actually running.
 */
export async function querySalesforce<T>(organizationId: string, soql: string): Promise<T[]> {
  let session = await getValidSalesforceSession(organizationId);
  const records: T[] = [];

  let url = `${session.instanceUrl}/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`;
  let attemptedRefresh = false;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    if (res.status === 401 && !attemptedRefresh) {
      attemptedRefresh = true;
      session = await getValidSalesforceSession(organizationId);
      continue;
    }

    if (!res.ok) {
      throw new Error(`Salesforce query failed (${res.status}): ${await res.text()}`);
    }

    const data: SoqlResponse<T> = await res.json();
    records.push(...data.records);

    url = data.nextRecordsUrl ? `${session.instanceUrl}${data.nextRecordsUrl}` : '';
  }

  return records;
}
