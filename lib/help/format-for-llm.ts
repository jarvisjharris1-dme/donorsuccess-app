import { HELP_ARTICLES, type HelpBlock } from '@/lib/help/content';

function blockToText(block: HelpBlock): string {
  switch (block.type) {
    case 'paragraph':
      return block.text;
    case 'heading':
      return `### ${block.text}`;
    case 'list':
    case 'steps':
      return block.items.map((item) => `- ${item}`).join('\n');
    case 'callout':
      return `Note: ${block.text}`;
    default:
      return '';
  }
}

/**
 * Flattens every Success Hub article into one text blob for inclusion
 * directly in a system prompt. With ~20 articles this comfortably fits
 * in a single prompt — no vector database or retrieval step needed for
 * a first version. If the help content grows enough that this becomes
 * unwieldy, that's the point to revisit with real retrieval, not
 * before.
 */
export function formatHelpContentForLLM(): string {
  return HELP_ARTICLES.map((article) => {
    const body = article.blocks.map(blockToText).join('\n\n');
    return `## ${article.title} (${article.category})\n${article.summary}\n\n${body}`;
  }).join('\n\n---\n\n');
}
