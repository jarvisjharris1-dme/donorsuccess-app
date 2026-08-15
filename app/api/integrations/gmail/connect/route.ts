import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { buildAuthorizationUrl } from '@/lib/integrations/gmail';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const url = buildAuthorizationUrl(session.user.id, req.url);
    return NextResponse.redirect(url);
  } catch (err) {
    const settingsUrl = new URL('/settings', req.url);
    settingsUrl.searchParams.set('email_error', 'not_configured');
    console.error('Gmail connect error:', err);
    return NextResponse.redirect(settingsUrl);
  }
}
