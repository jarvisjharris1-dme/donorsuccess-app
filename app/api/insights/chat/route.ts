import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Role, ChatRole } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { runInsightsChatTurn } from '@/lib/insights/chat';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!permissions.canEditDonors(session.user.role as Role)) {
    return NextResponse.json({ error: 'You do not have access to Insights.' }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Insights is not configured on this deployment yet.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;

  if (!question) return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 });
  if (question.length > 2000) {
    return NextResponse.json({ error: 'That question is too long \u2014 try shortening it.' }, { status: 400 });
  }

  const db = forOrg(session.user.organizationId);

  let chatSession = sessionId ? await db.chatSession.findUnique({ where: { id: sessionId } }) : null;
  if (!chatSession) {
    chatSession = await db.chatSession.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        title: question.slice(0, 80),
      },
    });
  }

  const priorMessages: { role: ChatRole; content: string }[] = await db.chatMessage.findMany({
    where: { sessionId: chatSession.id },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });

  await db.chatMessage.create({
    data: {
      organizationId: session.user.organizationId,
      sessionId: chatSession.id,
      role: ChatRole.USER,
      content: question,
      toolsUsed: [],
    },
  });

  const conversationHistory = [
    ...priorMessages.map((m) => ({ role: m.role === ChatRole.USER ? ('user' as const) : ('assistant' as const), content: m.content })),
    { role: 'user' as const, content: question },
  ];

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.SUPPORT_CHAT_MODEL || 'claude-sonnet-4-6';

  try {
    const result = await runInsightsChatTurn(anthropic, model, db, conversationHistory);

    await db.chatMessage.create({
      data: {
        organizationId: session.user.organizationId,
        sessionId: chatSession.id,
        role: ChatRole.ASSISTANT,
        content: result.content,
        toolsUsed: result.toolsUsed,
      },
    });

    return NextResponse.json({ sessionId: chatSession.id, answer: result.content, toolsUsed: result.toolsUsed });
  } catch (err) {
    console.error('Insights chat error:', err);
    return NextResponse.json({ error: 'Something went wrong answering that \u2014 try again.' }, { status: 500 });
  }
}
