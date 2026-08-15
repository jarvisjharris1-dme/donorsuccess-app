import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';

/**
 * Private Blob stores require authentication for every read, not just
 * an unguessable URL — get() handles that authentication via the
 * store's connected credentials. This route additionally re-verifies
 * the requester's own session and organization on every download
 * before ever calling get() at all, so access is gated twice: once by
 * this app's own auth, and once by Vercel Blob's own private-store
 * authentication underneath it.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = forOrg(session.user.organizationId);
  const document = await db.grantDocument.findUnique({ where: { id: params.id } });
  if (!document) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!document.pathname) {
    // Only possible for a document uploaded before this field existed —
    // shouldn't happen for anything uploaded going forward.
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
