import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { organizationId: string } },
) {
  const rows = await prisma.$queryRawUnsafe<Array<{ communityLogoPathname: string | null }>>(
    `SELECT "communityLogoPathname" FROM "organizations" WHERE "id" = $1 LIMIT 1`,
    params.organizationId,
  );
  const pathname = rows[0]?.communityLogoPathname;
  if (!pathname) return new NextResponse('Logo not found', { status: 404 });

  try {
    const result = await get(pathname, { access: 'private' });
    if (!result || result.statusCode !== 200) {
      return new NextResponse('Logo not found', { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Community Portal] Private logo read failed', error);
    return new NextResponse('Logo unavailable', { status: 404 });
  }
}
