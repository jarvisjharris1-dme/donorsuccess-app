import { createHmac } from 'crypto';

const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
// Mail.Send only — send-as access, not read access to someone's inbox.
// offline_access is required to get a refresh_token.
const SCOPES = 'openid email offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read';

function getRedirectUri(requestUrl: string): string {
  return new URL('/api/integrations/outlook/callback', requestUrl).toString();
}

function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set.');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createState(userId: string): string {
  const nonce = Math.random().toString(36).slice(2);
  const payload = Buffer.from(JSON.stringify({ userId, nonce })).toString('base64url');
  return `${payload}.${signState(payload)}`;
}

export function verifyState(state: string): { userId: string } | null {
  const [payload, signature] = state.split('.');
  if (!payload || !signature) return null;
  if (signState(payload) !== signature) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof decoded.userId === 'string' ? { userId: decoded.userId } : null;
  } catch {
    return null;
  }
}

export function buildAuthorizationUrl(userId: string, requestUrl: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error('MICROSOFT_CLIENT_ID is not set.');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(requestUrl),
    scope: SCOPES,
    state: createState(userId),
    response_mode: 'query',
  });

  return `${MS_AUTH_URL}?${params.toString()}`;
}

export type MicrosoftTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

export async function exchangeCodeForTokens(
  code: string,
  requestUrl: string,
): Promise<MicrosoftTokenResponse> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET are not set.');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(requestUrl),
    scope: SCOPES,
  });

  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Microsoft token exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET are not set.');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: SCOPES,
  });

  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Microsoft token refresh failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function fetchUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Microsoft user info (${res.status})`);
  const data = await res.json();
  return data.mail ?? data.userPrincipalName;
}

export async function sendOutlookMessage(params: {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: params.subject,
        body: { contentType: 'Text', content: params.body },
        toRecipients: [{ emailAddress: { address: params.to } }],
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) throw new Error(`Outlook send failed (${res.status}): ${await res.text()}`);
}
