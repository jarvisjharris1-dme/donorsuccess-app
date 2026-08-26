import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  findPendingTurboDocxOrderByDocumentTitle,
  getOrderByTurboSignDocumentId,
  updateOrder,
} from '@/lib/orders';

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
    document_name?: string;
    documentName?: string;
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
  const documentTitle = payload.data?.title || payload.data?.document_name || payload.data?.documentName || '';
  if (!documentId) {
    return NextResponse.json({ received: true, matched: false, reason: 'missing_document_id' });
  }

  let order = await getOrderByTurboSignDocumentId(documentId);

  // Sales-assisted orders no longer require a user to hunt down a hidden TurboSign UUID.
  // If this document has never been linked, use the TurboSign document title to find the
  // single pending order whose organization name or quote ID appears in that title, then
  // persist the document ID so every future event uses the exact match.
  if (!order && documentTitle) {
    const candidate = await findPendingTurboDocxOrderByDocumentTitle(documentTitle);
    if (candidate) {
      order = await updateOrder(candidate.id, { turboSignDocumentId: documentId });
      console.info(`Auto-linked TurboSign document ${documentId} to ${candidate.orderNumber}`);
    }
  }

  if (!order) {
    console.warn(`TurboDocx webhook received for unlinked document ${documentId}; title=${documentTitle || 'unknown'}`);
    return NextResponse.json({ received: true, matched: false, reason: 'no_unique_pending_order' });
  }

  if (eventType === 'signature.document.completed') {
    if (order.status !== 'SIGNED' && !order.provisionedAt) {
      await updateOrder(order.id, {
        status: 'SIGNED',
        turboSignDocumentId: documentId,
        signedAt: payload.data?.completed_at ? new Date(payload.data.completed_at) : new Date(),
      });
    }
  } else if (eventType === 'signature.document.voided') {
    if (!order.provisionedAt) {
      await updateOrder(order.id, {
        status: 'VOIDED',
        turboSignDocumentId: documentId,
        notes: payload.data?.void_reason
          ? `TurboSign voided: ${payload.data.void_reason}`
          : order.notes,
      });
    }
  }

  return NextResponse.json({ received: true, matched: true, orderId: order.id });
}
