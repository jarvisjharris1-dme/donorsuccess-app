import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const runtime = 'nodejs';

const TURBODOCX_API_BASE = 'https://api.turbodocx.com';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isPlatformAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.TURBODOCX_API_KEY;
  const orgId = process.env.TURBODOCX_ORG_ID;
  if (!apiKey || !orgId) {
    return NextResponse.json({ error: 'TurboDocx API key or organization ID is not configured.' }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const webhookUrl = `${origin}/api/webhooks/turbodocx`;

  try {
    const response = await fetch(`${TURBODOCX_API_BASE}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Organization-Id': orgId,
      },
      body: JSON.stringify({
        urls: [webhookUrl],
        events: ['signature.document.completed', 'signature.document.voided'],
      }),
      cache: 'no-store',
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('TurboDocx webhook registration failed', response.status, body);
      return NextResponse.json({ error: body?.message || body?.error || `TurboDocx returned ${response.status}` }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      webhookId: body.id,
      secret: body.secret,
      webhookUrl,
      warning: 'Copy the secret now. TurboDocx only returns it once.',
    });
  } catch (error) {
    console.error('TurboDocx webhook registration error', error);
    return NextResponse.json({ error: 'Unable to register TurboDocx webhook.' }, { status: 500 });
  }
}
