import { EmailProvider } from '@prisma/client';
import { prisma } from '@/lib/db';
import { encryptToken, decryptToken } from '@/lib/crypto';
import * as gmail from './gmail';
import * as outlook from './outlook';

export type EmailConnectionInfo = {
  provider: EmailProvider;
  emailAddress: string;
};

/**
 * Looks up a user's connected email account. Raw `prisma` client, not
 * forOrg() — EmailConnection is scoped by userId, not organizationId,
 * so it doesn't have the field the tenant-scoping extension injects.
 */
export async function getEmailConnection(userId: string): Promise<EmailConnectionInfo | null> {
  const connection = await prisma.emailConnection.findUnique({
    where: { userId },
    select: { provider: true, emailAddress: true },
  });
  return connection;
}

/**
 * Returns a valid (non-expired) access token for the user's connection,
 * refreshing and persisting a new one first if the current one has
 * expired. Throws if there's no connection at all — callers should
 * check getEmailConnection() first if they want a friendlier message
 * for "not connected" versus a genuine send failure.
 */
async function getValidAccessToken(userId: string): Promise<{
  provider: EmailProvider;
  accessToken: string;
  emailAddress: string;
}> {
  const connection = await prisma.emailConnection.findUnique({ where: { userId } });
  if (!connection) {
    throw new Error('No connected email account. Connect Gmail or Outlook in Settings first.');
  }

  const isExpired = !connection.tokenExpiresAt || connection.tokenExpiresAt < new Date();
  if (!isExpired) {
    return {
      provider: connection.provider,
      accessToken: decryptToken(connection.accessTokenEncrypted),
      emailAddress: connection.emailAddress,
    };
  }

  if (!connection.refreshTokenEncrypted) {
    throw new Error('Your email connection has expired and can\u2019t be refreshed — reconnect it in Settings.');
  }

  const refreshToken = decryptToken(connection.refreshTokenEncrypted);
  const refreshed =
    connection.provider === EmailProvider.GMAIL
      ? await gmail.refreshAccessToken(refreshToken)
      : await outlook.refreshAccessToken(refreshToken);

  await prisma.emailConnection.update({
    where: { userId },
    data: {
      accessTokenEncrypted: encryptToken(refreshed.access_token),
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      // Google/Microsoft don't always return a new refresh_token on
      // refresh — only overwrite it when one actually comes back.
      ...(refreshed.refresh_token ? { refreshTokenEncrypted: encryptToken(refreshed.refresh_token) } : {}),
    },
  });

  return {
    provider: connection.provider,
    accessToken: refreshed.access_token,
    emailAddress: connection.emailAddress,
  };
}

export async function sendEmailAsUser(params: {
  userId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const { provider, accessToken, emailAddress } = await getValidAccessToken(params.userId);

  if (provider === EmailProvider.GMAIL) {
    await gmail.sendGmailMessage({
      accessToken,
      from: emailAddress,
      to: params.to,
      subject: params.subject,
      body: params.body,
    });
  } else {
    await outlook.sendOutlookMessage({
      accessToken,
      to: params.to,
      subject: params.subject,
      body: params.body,
    });
  }
}
