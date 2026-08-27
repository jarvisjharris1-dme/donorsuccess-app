import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCommunityApplicantSession } from '@/lib/community-portal';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getCommunityApplicantSession();
  if (!session) return NextResponse.redirect(new URL('/community', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));

  type Row = { fileName: string; fileUrl: string; mimeType: string | null };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT d."fileName", d."fileUrl", d."mimeType"
     FROM "community_application_documents" d
     JOIN "grantee_applications" a ON a."id" = d."applicationId"
     WHERE d."id" = $1
       AND d."organizationId" = $2
       AND a."granteeId" = $3
     LIMIT 1`,
    params.id,
    session.organizationId,
    session.granteeId,
  );
  const document = rows[0];
  if (!document) return new NextResponse('Not found', { status: 404 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return new NextResponse('File storage is not configured.', { status: 503 });

  const response = await fetch(document.fileUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: 'no-store',
  });
  if (!response.ok || !response.body) return new NextResponse('Document could not be retrieved.', { status: 502 });

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': document.mimeType || response.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${document.fileName.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
