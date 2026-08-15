import { createHmac } from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
// gmail.send is deliberately the *only* Gmail scope requested — send-as
// access, not read access to someone's inbox. userinfo.email just gets
// their address back so we can show "Connected as you@org.com".
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function getRedirectUri(requestUrl: string): string {
  return new URL('/api/integrations/gmail/callback', requestUrl).toString();
}

function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set.');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Encodes { userId } into a signed state string — same CSRF-protection pattern as the Salesforce connection. */
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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set.');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(requestUrl),
    scope: SCOPES,
    state: createState(userId),
    access_type: 'offline', // required to get a refresh_token at all
    prompt: 'consent', // forces the consent screen so a refresh_token is issued even on a repeat connection
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

export async function exchangeCodeForTokens(
  code: string,
  requestUrl: string,
): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set.');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(requestUrl),
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set.');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function fetchUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Google user info (${res.status})`);
  const data = await res.json();
  return data.email;
}

/** Builds an RFC 2822 message and base64url-encodes it — the shape Gmail's API requires. */
function buildRawMessage(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): string {
  const message = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    params.body,
  ].join('\r\n');

  return Buffer.from(message).toString('base64url');
}

export async function sendGmailMessage(params: {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const raw = buildRawMessage(params);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail send failed (${res.status}): ${await res.text()}`);
}
