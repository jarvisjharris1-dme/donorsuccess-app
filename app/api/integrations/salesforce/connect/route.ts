import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { buildAuthorizationUrl } from '@/lib/integrations/salesforce';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (!permissions.canManageOrgSettings(session.user.role as Role)) {
    return NextResponse.redirect(new URL('/settings', req.url));
  }

  try {
    const url = buildAuthorizationUrl(session.user.organizationId, req.url);
    return NextResponse.redirect(url);
  } catch (err) {
    const settingsUrl = new URL('/settings', req.url);
    settingsUrl.searchParams.set('salesforce_error', 'not_configured');
    console.error('Salesforce connect error:', err);
    return NextResponse.redirect(settingsUrl);
  }
}
