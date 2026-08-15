import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { formatHelpContentForLLM } from '@/lib/help/format-for-llm';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_MESSAGES = 20; // caps both cost and prompt size for a runaway conversation
const MAX_MESSAGE_LENGTH = 2000;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function buildSystemPrompt(): string {
  return `You are the Donor Success support assistant, embedded in the app. You help users understand how to use the product.

Ground rules:
- Answer ONLY using the reference material below. It's the full Success Hub help content.
- You have no access to the user's actual donors, grants, or any other real data in their account — never imply otherwise, and never make up specifics about "their" donors or numbers.
- If a question is outside what's covered below, say so plainly and suggest they check the full Success Hub (linked in the main navigation) or contact support — don't guess or invent an answer.
- Keep answers short and direct — a few sentences, not an essay. This is a chat widget, not a documentation page.
- Never claim the product does something automatically if the reference material describes a human-approval step (e.g. Success Sequences never send without a person clicking Send) — this distinction matters and should never be glossed over.

Reference material (the Success Hub):

${formatHelpContentForLLM()}`;
}

/** True only for a plain object shaped like { role: 'user'|'assistant', content: unknown }. Guards every field before any property access, since this is unvalidated client input. */
function isChatMessageShape(m: unknown): m is { role: unknown; content: unknown } {
  return typeof m === 'object' && m !== null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Support chat is not configured yet.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const rawMessages: unknown = body?.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: 'Missing messages.' }, { status: 400 });
  }

  // Trust nothing about shape or size from the client — this is a
  // straightforward chat endpoint, but it's still user-controlled
  // input feeding an LLM call with a real per-token cost. Every guard
  // here is checked left-to-right before any property access, so a
  // malformed entry (null, a string, a number) is filtered out rather
  // than crashing the route.
  const safeMessages: ChatMessage[] = rawMessages
    .slice(-MAX_MESSAGES)
    .filter(isChatMessageShape)
    .filter((m): m is { role: 'user' | 'assistant'; content: unknown } => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content.slice(0, MAX_MESSAGE_LENGTH) : '',
    }))
    .filter((m) => m.content.trim().length > 0);

  if (safeMessages.length === 0) {
    return NextResponse.json({ error: 'Missing messages.' }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const anthropicStream = anthropic.messages.stream({
          model: process.env.SUPPORT_CHAT_MODEL || 'claude-sonnet-4-6',
          max_tokens: 500,
          // The system prompt (all ~20 Success Hub articles) is
          // identical on every single request — it never changes based
          // on what the user asks. Marking it as an ephemeral cache
          // breakpoint means only the first message in a conversation
          // pays full price for it; every message after that within the
          // 5-minute cache window reads it back at roughly 10% of the
          // normal input cost instead of resending and reprocessing the
          // same large block of text every single turn.
          system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }],
          messages: safeMessages,
        });

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error('Support chat error:', err);
        controller.enqueue(
          encoder.encode('\n\nSomething went wrong on our end — try again in a moment.'),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
