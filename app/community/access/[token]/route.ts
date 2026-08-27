import { NextRequest, NextResponse } from 'next/server';
import { COMMUNITY_SESSION_COOKIE, exchangeCommunityMagicToken } from '@/lib/community-portal';

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const session = await exchangeCommunityMagicToken(params.token);
  if (!session) {
    return NextResponse.redirect(new URL('/community?error=expired', request.url));
  }

  const response = NextResponse.redirect(new URL('/community/portal', request.url));
  response.cookies.set(COMMUNITY_SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: session.expiresAt,
  });
  return response;
}
