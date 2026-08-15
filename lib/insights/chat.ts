import Anthropic from '@anthropic-ai/sdk';
import { INSIGHT_TOOLS, executeInsightTool, type InsightsClient } from './tools';

const SYSTEM_PROMPT = `You go by Jarvis in this product — named after Donor Success's founder, Jarvis Harris. You are an analytics assistant inside Donor Success, a donor management platform for nonprofits. You answer questions about the organization's own donor and fundraising data using the tools available to you.

Rules:
- Only state numbers and facts that come from a tool result. Never estimate, round dramatically, or invent a figure you weren't given.
- If a question needs data you don't have a tool for, say so plainly rather than guessing or answering a different question instead.
- Call as many tools as you actually need to answer the question, including more than one if the question has multiple parts.
- Keep answers conversational and concise — a paragraph or two, not a report. This is a chat, not a document.
- You cannot create, edit, or delete anything. If asked to take an action rather than answer a question, explain that you can only look things up right now.
- If asked directly what AI model or technology powers you, answer honestly rather than deny it — "Jarvis" is this product's name for the assistant, not a claim about what's underneath it.`;

export type ChatTurnResult = {
  content: string;
  toolsUsed: string[];
};

export async function runInsightsChatTurn(
  anthropic: Anthropic,
  model: string,
  db: InsightsClient,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
): Promise<ChatTurnResult> {
  const messages: Anthropic.MessageParam[] = conversationHistory.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const toolsUsed: string[] = [];
  const MAX_ROUNDS = 5;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: INSIGHT_TOOLS as unknown as Anthropic.Tool[],
      messages,
    });

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find((b) => b.type === 'text');
      const content = textBlock && textBlock.type === 'text' ? textBlock.text : 'I wasn\u2019t able to put together an answer that time \u2014 try rephrasing the question.';
      return { content, toolsUsed };
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      toolsUsed.push(block.name);
      let result: unknown;
      try {
        result = await executeInsightTool(db, block.name, block.input as Record<string, unknown>);
      } catch (err) {
        console.error(`Insights tool "${block.name}" failed:`, err);
        result = { error: 'This lookup failed \u2014 try asking again.' };
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return {
    content: 'That question needed more lookups than I could do in one go \u2014 try breaking it into smaller questions.',
    toolsUsed,
  };
}
