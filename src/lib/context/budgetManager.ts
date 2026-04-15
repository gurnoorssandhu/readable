import { estimateTokens } from '@/lib/utils';
import type { ChatMessage } from '@/types/session';

export function estimateTokenCount(text: string): number {
  return estimateTokens(text);
}

export function estimateImageTokenCount(base64: string): number {
  // Estimate from base64 length: base64 encodes 3 bytes into 4 chars.
  // A typical compressed image at ~1 byte/pixel gives us a rough pixel count.
  // The Anthropic vision model charges ~1 token per 750 pixels.
  const rawBytes = Math.ceil((base64.length * 3) / 4);
  // Assume JPEG/PNG compression ratio of ~10:1 for a rough pixel estimate
  const estimatedPixels = rawBytes * 10;
  return Math.ceil(estimatedPixels / 750);
}

export function shouldCompactConversation(
  messages: ChatMessage[],
  budget: number
): boolean {
  let totalTokens = 0;
  for (const msg of messages) {
    totalTokens += estimateTokenCount(msg.content);
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        totalTokens += estimateTokenCount(JSON.stringify(tc.input));
        if (tc.result) {
          totalTokens += estimateTokenCount(tc.result);
        }
      }
    }
  }
  return totalTokens > budget * 0.8;
}

export function compactConversation(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 40) {
    return messages;
  }

  // Keep the most recent 20 pairs (40 messages) intact
  const keepCount = 40;
  const olderMessages = messages.slice(0, messages.length - keepCount);
  const recentMessages = messages.slice(messages.length - keepCount);

  // Build a brief summary of the older conversation
  const topicSet = new Set<string>();
  let questionCount = 0;

  for (const msg of olderMessages) {
    if (msg.role === 'user') {
      questionCount++;
      // Extract first 80 chars as a topic indicator
      const snippet = msg.content.slice(0, 80).replace(/\n/g, ' ').trim();
      if (snippet) {
        topicSet.add(snippet);
      }
    }
  }

  const topics = Array.from(topicSet).slice(0, 10);
  const summaryText = [
    `[Earlier conversation summary: ${questionCount} exchanges covering the following topics:]`,
    ...topics.map((t) => `- ${t}${t.length >= 80 ? '...' : ''}`),
    `[End of summary. The detailed conversation continues below.]`,
  ].join('\n');

  const summaryMessage: ChatMessage = {
    id: 'compaction-summary',
    role: 'system',
    content: summaryText,
    timestamp: olderMessages[0]?.timestamp ?? Date.now(),
  };

  return [summaryMessage, ...recentMessages];
}
