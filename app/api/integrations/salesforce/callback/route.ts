import { NextRequest, NextResponse } from 'next/server';
import { CrmProvider, CrmConnectionStatus } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { verifyState, exchangeCodeForTokens } from '@/lib/integrations/salesforce';
import { encryptToken } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  const settingsUrl = new URL('/settings', req.url);
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');

  if (oauthError) {
    settingsUrl.searchParams.set('salesforce_error', oauthError);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    settingsUrl.searchParams.set('salesforce_error', 'missing_code_or_state');
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyState(state);
  if (!verified) {
    settingsUrl.searchParams.set('salesforce_error', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  // The signed state already proves this callback corresponds to a
  // connect request we issued for this org — this session check is
  // defense in depth on top of that, not the primary CSRF protection.
  const session = await auth();
  if (!session || session.user.organizationId !== verified.organizationId) {
    settingsUrl.searchParams.set('salesforce_error', 'session_mismatch');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, req.url, verified.codeVerifier);

    // Raw `prisma` client, not forOrg() — see the comment on
    // CrmConnection in schema.prisma. organizationId is written by hand
    // into both the compound `where` key and `create`, so this is fully
    // and correctly tenant-scoped despite not going through the
    // extension.
    await prisma.crmConnection.upsert({
      where: {
        organizationId_provider: {
          organizationId: verified.organizationId,
          provider: CrmProvider.SALESFORCE,
        },
      },
      update: {
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        instanceUrl: tokens.instance_url,
        status: CrmConnectionStatus.CONNECTED,
        lastError: null,
        connectedById: session.user.id,
      },
      create: {
        organizationId: verified.organizationId,
        provider: CrmProvider.SALESFORCE,
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        instanceUrl: tokens.instance_url,
        connectedById: session.user.id,
      },
    });

    settingsUrl.searchParams.set('salesforce_connected', '1');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error('Salesforce OAuth callback error:', err);
    const code = err instanceof Error && err.message ? err.message : 'token_exchange_failed';
    settingsUrl.searchParams.set('salesforce_error', code);
    return NextResponse.redirect(settingsUrl);
  }
}
