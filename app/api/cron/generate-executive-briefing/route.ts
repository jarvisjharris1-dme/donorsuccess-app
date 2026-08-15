import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { generateBriefingForOrg } from '@/lib/dashboard/generate-briefing';
import { withDbConnectionRetry } from '@/lib/db-retry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Executive briefing cron skipped: ANTHROPIC_API_KEY is not set.');
    return NextResponse.json({ ok: false, reason: 'not configured' });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.SUPPORT_CHAT_MODEL || 'claude-sonnet-4-6';

  const organizations = await withDbConnectionRetry(() =>
    prisma.organization.findMany({ select: { id: true } }),
  );

  let succeeded = 0;
  let failed = 0;

  // Sequential, not Promise.all — this is a low-frequency (daily) batch
  // job, not a user-facing request, so there's no reason to burst all
  // organizations' API calls at once and risk hitting a rate limit;
  // one slow or failed org shouldn't affect the others either way.
  for (const org of organizations) {
    try {
      const { content, modelUsed } = await generateBriefingForOrg(org.id, anthropic, model);
      await prisma.executiveBriefingSnapshot.upsert({
        where: { organizationId: org.id },
        create: { organizationId: org.id, content, modelUsed },
        update: { content, modelUsed, generatedAt: new Date() },
      });
      succeeded += 1;
    } catch (err) {
      console.error(`Executive briefing generation failed for org ${org.id}:`, err);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), succeeded, failed });
}
