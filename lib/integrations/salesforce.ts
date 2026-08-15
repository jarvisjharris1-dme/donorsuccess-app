import { createHash, createHmac, randomBytes } from 'crypto';

// Sandboxes use test.salesforce.com instead — overridable per org
// without a code change if someone's connecting a sandbox for testing.
const SALESFORCE_LOGIN_URL = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

// `api` for REST API access, `refresh_token` so the connection survives
// past the initial access token's expiry (Salesforce access tokens are
// short-lived; without this scope we'd need to re-authorize constantly).
const SCOPES = 'api refresh_token';

function getRedirectUri(requestUrl: string): string {
  return new URL('/api/integrations/salesforce/callback', requestUrl).toString();
}

function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set.');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * PKCE (RFC 7636) — Salesforce's newer External Client App model
 * enforces this by default (Connected Apps could go either way
 * depending on settings; ECAs seem to require it), rejecting an
 * authorization request with "missing required code challenge" if it's
 * absent. The verifier is a random string; the challenge sent up front
 * is its SHA-256 hash, and the raw verifier is only revealed later
 * during the token exchange — proving the same client that started the
 * flow is the one finishing it, independent of the state-based CSRF
 * check below.
 */
function generateCodeVerifier(): string {
  // 32 random bytes -> 43 base64url characters, within the 43-128
  // character range RFC 7636 requires.
  return randomBytes(32).toString('base64url');
}

function codeChallengeFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Encodes { organizationId, codeVerifier } into a signed, URL-safe
 * state string. Two jobs bundled into one payload: organizationId is
 * this flow's CSRF protection (the callback only trusts an org that
 * came back with a valid signature), and codeVerifier rides along here
 * too so it survives the redirect round-trip without needing separate
 * server-side session storage — the whole blob is HMAC-signed, so
 * tampering with either value is detected the same way. Signed with
 * AUTH_SECRET rather than a separate key — it's already a strong
 * secret dedicated to exactly this kind of signing purpose in this app.
 */
export function createState(organizationId: string, codeVerifier: string): string {
  const nonce = Math.random().toString(36).slice(2);
  const payload = Buffer.from(JSON.stringify({ organizationId, nonce, codeVerifier })).toString(
    'base64url',
  );
  return `${payload}.${signState(payload)}`;
}

export function verifyState(state: string): { organizationId: string; codeVerifier: string } | null {
  const [payload, signature] = state.split('.');
  if (!payload || !signature) return null;
  if (signState(payload) !== signature) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof decoded.organizationId === 'string' && typeof decoded.codeVerifier === 'string'
      ? { organizationId: decoded.organizationId, codeVerifier: decoded.codeVerifier }
      : null;
  } catch {
    return null;
  }
}

export function buildAuthorizationUrl(organizationId: string, requestUrl: string): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  if (!clientId) throw new Error('SALESFORCE_CLIENT_ID is not set.');

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = codeChallengeFromVerifier(codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(requestUrl),
    scope: SCOPES,
    state: createState(organizationId, codeVerifier),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${SALESFORCE_LOGIN_URL}/services/oauth2/authorize?${params.toString()}`;
}

export type SalesforceTokenResponse = {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  token_type: string;
  issued_at: string;
};

export async function exchangeCodeForTokens(
  code: string,
  requestUrl: string,
  codeVerifier: string,
): Promise<SalesforceTokenResponse> {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SALESFORCE_CLIENT_ID / SALESFORCE_CLIENT_SECRET are not set.');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(requestUrl),
    code_verifier: codeVerifier,
  });

  const res = await fetch(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    console.error(`Salesforce token exchange failed (${res.status}): ${bodyText}`);
    // Salesforce's token endpoint returns { error, error_description }
    // on failure. The short `error` code (e.g. "invalid_grant",
    // "invalid_client_id") is safe to surface in the UI — it's a fixed
    // OAuth error keyword, never a secret. error_description sometimes
    // isn't, so that stays server-log-only (see console.error above).
    let code = 'unknown_error';
    try {
      const parsed = JSON.parse(bodyText);
      if (typeof parsed.error === 'string') code = parsed.error;
    } catch {
      // Body wasn't JSON — keep the generic code; the full text is
      // still in the server log either way.
    }
    throw new Error(code);
  }

  return res.json();
}

/**
 * Phase 2+ (actual data sync) will need this to refresh an expired
 * access token using the stored refresh token before making API calls.
 * Nothing calls it yet — there's no sync logic that needs a fresh token
 * this phase — but the shape is worth having settled now rather than
 * guessed at later.
 */
export async function refreshAccessToken(refreshToken: string): Promise<SalesforceTokenResponse> {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SALESFORCE_CLIENT_ID / SALESFORCE_CLIENT_SECRET are not set.');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Salesforce token refresh failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}
