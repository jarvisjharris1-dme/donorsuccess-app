import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isPlatformAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.TURBODOCX_API_KEY;
  const orgId = process.env.TURBODOCX_ORG_ID;
  if (!apiKey || !orgId) return NextResponse.json({ error: 'TurboDocx credentials are not configured.' }, { status: 500 });

  const input = await req.json().catch(() => ({}));
  const organizationName = String(input.organizationName || '').trim();
  const quoteId = String(input.quoteId || '').trim();
  const eventType = input.eventType === 'signature.document.voided'
    ? 'signature.document.voided'
    : 'signature.document.completed';
  if (!organizationName) return NextResponse.json({ error: 'Organization name is required.' }, { status: 400 });

  const testDocumentId = `ds-test-${crypto.randomUUID()}`;
  const title = quoteId ? `${organizationName} - ${quoteId}` : organizationName;
  const now = new Date().toISOString();
  const payload = {
    document_id: testDocumentId,
    documentId: testDocumentId,
    title,
    status: eventType.endsWith('completed') ? 'completed' : 'voided',
    ...(eventType.endsWith('completed') ? { completed_at: now } : { voided_at: now, void_reason: 'Donor Success webhook test' }),
  };

  const response = await fetch('https://api.turbodocx.com/api/webhooks/signature/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'x-rapiddocx-org-id': orgId,
    },
    body: JSON.stringify({ eventType, payload }),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: body?.message || body?.error || `TurboDocx returned ${response.status}`, details: body }, { status: response.status });

  const data = body?.data || body;
  return NextResponse.json({ success: true, eventType, testDocumentId, title, deliveries: data?.deliveries || [], summary: data?.summary || null });
}
