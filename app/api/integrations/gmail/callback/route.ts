import { NextRequest, NextResponse } from 'next/server';
import { EmailProvider } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { verifyState, exchangeCodeForTokens, fetchUserEmail } from '@/lib/integrations/gmail';
import { encryptToken } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  const settingsUrl = new URL('/settings', req.url);
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');

  if (oauthError) {
    settingsUrl.searchParams.set('email_error', oauthError);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    settingsUrl.searchParams.set('email_error', 'missing_code_or_state');
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyState(state);
  if (!verified) {
    settingsUrl.searchParams.set('email_error', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  const session = await auth();
  if (!session || session.user.id !== verified.userId) {
    settingsUrl.searchParams.set('email_error', 'session_mismatch');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, req.url);
    const emailAddress = await fetchUserEmail(tokens.access_token);

    // Raw `prisma` client — EmailConnection is keyed by userId, not
    // organizationId, so forOrg() doesn't apply here at all.
    await prisma.emailConnection.upsert({
      where: { userId: session.user.id },
      update: {
        provider: EmailProvider.GMAIL,
        emailAddress,
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      create: {
        userId: session.user.id,
        provider: EmailProvider.GMAIL,
        emailAddress,
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    settingsUrl.searchParams.set('email_connected', '1');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error('Gmail OAuth callback error:', err);
    settingsUrl.searchParams.set('email_error', 'token_exchange_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
