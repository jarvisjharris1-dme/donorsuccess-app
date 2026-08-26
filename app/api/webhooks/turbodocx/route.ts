import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getOrderByTurboSignDocumentId, updateOrder } from '@/lib/orders';

export const runtime = 'nodejs';

function verifySignature(body: string, signatureHeader: string, timestamp: string, secret: string) {
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  const supplied = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;
  if (!/^[0-9a-f]{64}$/i.test(supplied)) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const suppliedBuffer = Buffer.from(supplied, 'hex');
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

type TurboWebhook = {
  event?: string;
  eventType?: string;
  event_id?: string;
  data?: {
    document_id?: string;
    documentId?: string;
    title?: string;
    status?: string;
    completed_at?: string;
    voided_at?: string;
    void_reason?: string;
  };
};

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-turbodocx-signature') || '';
  const timestamp = req.headers.get('x-turbodocx-timestamp') || '';
  const secret = process.env.TURBODOCX_WEBHOOK_SECRET || '';
  if (!signature || !timestamp || !secret) {
    return NextResponse.json({ error: 'Missing webhook verification data' }, { status: 400 });
  }

  const body = await req.text();
  if (!verifySignature(body, signature, timestamp, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: TurboWebhook;
  try {
    payload = JSON.parse(body) as TurboWebhook;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = payload.event || payload.eventType || req.headers.get('x-turbodocx-event') || '';
  const documentId = payload.data?.document_id || payload.data?.documentId;
  if (!documentId) {
    return NextResponse.json({ received: true, matched: false });
  }

  const order = await getOrderByTurboSignDocumentId(documentId);
  if (!order) {
    console.warn(`TurboDocx webhook received for unlinked document ${documentId}`);
    return NextResponse.json({ received: true, matched: false });
  }

  if (eventType === 'signature.document.completed') {
    if (order.status !== 'SIGNED' && !order.provisionedAt) {
      await updateOrder(order.id, {
        status: 'SIGNED',
        signedAt: payload.data?.completed_at ? new Date(payload.data.completed_at) : new Date(),
      });
    }
  } else if (eventType === 'signature.document.voided') {
    if (!order.provisionedAt) {
      await updateOrder(order.id, {
        status: 'VOIDED',
        notes: payload.data?.void_reason
          ? `TurboSign voided: ${payload.data.void_reason}`
          : order.notes,
      });
    }
  }

  return NextResponse.json({ received: true, matched: true, orderId: order.id });
}
