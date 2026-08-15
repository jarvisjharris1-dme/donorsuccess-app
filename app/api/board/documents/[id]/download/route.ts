import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = forOrg(session.user.organizationId);
  const document = await db.boardMeetingDocument.findUnique({ where: { id: params.id } });
  if (!document) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!document.pathname) {
    return NextResponse.json(
      { error: 'This file was uploaded before private storage was set up and needs to be re-uploaded.' },
      { status: 410 },
    );
  }

  const result = await get(document.pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: 'Could not retrieve file' }, { status: 502 });
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': document.mimeType || result.blob.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
    },
  });
}
