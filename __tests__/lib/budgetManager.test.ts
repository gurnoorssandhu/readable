import {
  estimateTokenCount,
  shouldCompactConversation,
  compactConversation,
} from '@/lib/context/budgetManager';
import type { ChatMessage } from '@/types/session';

function makeMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  toolCalls?: ChatMessage['toolCalls']
): ChatMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    timestamp: Date.now(),
    toolCalls,
  };
}

describe('estimateTokenCount', () => {
  it('delegates to estimateTokens (ceil(length / 4))', () => {
    expect(estimateTokenCount('abcd')).toBe(1);
    expect(estimateTokenCount('abcde')).toBe(2);
    expect(estimateTokenCount('')).toBe(0);
  });
});

describe('shouldCompactConversation', () => {
  it('returns false when token count is well below 80% of budget', () => {
    const messages = [makeMessage('user', 'Hello')]; // ~2 tokens
    expect(shouldCompactConversation(messages, 1000)).toBe(false);
  });

  it('returns true when token count exceeds 80% of budget', () => {
    // Each char adds ~0.25 tokens. We need total > budget * 0.8
    // With budget 10, threshold is 8 tokens = 32 chars
    const messages = [makeMessage('user', 'a'.repeat(40))]; // 10 tokens
    expect(shouldCompactConversation(messages, 10)).toBe(true);
  });

  it('returns false at exactly 80% of budget', () => {
    // budget=10, threshold=8 tokens = 32 chars exactly
    const messages = [makeMessage('user', 'a'.repeat(32))]; // 8 tokens
    // 8 > 8 is false
    expect(shouldCompactConversation(messages, 10)).toBe(false);
  });

  it('includes tool call input and result in token estimate', () => {
    const toolCalls = [
      {
        id: 'tc1',
        name: 'search',
        input: { query: 'test' },
        result: 'a'.repeat(100),
        status: 'complete' as const,
      },
    ];
    const messages = [makeMessage('assistant', 'short', toolCalls)];
    // content: "short" -> 2 tokens
    // input: JSON.stringify({query:"test"}) -> ~4 tokens
    // result: 100 chars -> 25 tokens
    // total: ~31 tokens, well above budget of 10
    expect(shouldCompactConversation(messages, 10)).toBe(true);
  });

  it('handles empty messages array', () => {
    expect(shouldCompactConversation([], 1000)).toBe(false);
  });

  it('handles tool calls with no result', () => {
    const toolCalls = [
      {
        id: 'tc1',
        name: 'search',
        input: { query: 'test' },
        status: 'pending' as const,
      },
    ];
    const messages = [makeMessage('user', 'hi', toolCalls)];
    // Should not throw; result is undefined so it's skipped
    expect(shouldCompactConversation(messages, 1000)).toBe(false);
  });
});

describe('compactConversation', () => {
  it('returns messages unchanged if 40 or fewer', () => {
    const messages = Array.from({ length: 40 }, (_, i) =>
      makeMessage(i % 2 === 0 ? 'user' : 'assistant', `message ${i}`)
    );
    const result = compactConversation(messages);
    expect(result).toEqual(messages);
    expect(result.length).toBe(40);
  });

  it('returns messages unchanged if fewer than 40', () => {
    const messages = [
      makeMessage('user', 'hello'),
      makeMessage('assistant', 'hi'),
    ];
    const result = compactConversation(messages);
    expect(result).toEqual(messages);
  });

  it('compacts messages when more than 40, keeping last 40 plus summary', () => {
    const messages = Array.from({ length: 60 }, (_, i) =>
      makeMessage(i % 2 === 0 ? 'user' : 'assistant', `message ${i}`)
    );
    const result = compactConversation(messages);
    // 1 summary + 40 recent = 41
    expect(result.length).toBe(41);
  });

  it('first message in compacted result is a system summary', () => {
    const messages = Array.from({ length: 60 }, (_, i) =>
      makeMessage(i % 2 === 0 ? 'user' : 'assistant', `message ${i}`)
    );
    const result = compactConversation(messages);
    expect(result[0].role).toBe('system');
    expect(result[0].id).toBe('compaction-summary');
    expect(result[0].content).toContain('Earlier conversation summary');
  });

  it('keeps exactly the last 40 messages intact', () => {
    const messages = Array.from({ length: 60 }, (_, i) =>
      makeMessage(i % 2 === 0 ? 'user' : 'assistant', `msg-${i}`)
    );
    const result = compactConversation(messages);
    const recentMessages = result.slice(1);
    expect(recentMessages.length).toBe(40);
    // The recent messages should be the last 40 from the original
    for (let i = 0; i < 40; i++) {
      expect(recentMessages[i].content).toBe(`msg-${i + 20}`);
    }
  });

  it('summary includes topic snippets from older user messages', () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 50; i++) {
      if (i % 2 === 0) {
        messages.push(makeMessage('user', `Question about topic ${i}`));
      } else {
        messages.push(makeMessage('assistant', `Answer ${i}`));
      }
    }
    const result = compactConversation(messages);
    const summary = result[0].content;
    expect(summary).toContain('exchanges');
    // Should contain at least some topic snippets
    expect(summary).toContain('Question about topic');
  });

  it('summary limits topics to 10', () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 80; i++) {
      messages.push(
        makeMessage(
          i % 2 === 0 ? 'user' : 'assistant',
          `unique topic number ${i} with detailed explanation`
        )
      );
    }
    const result = compactConversation(messages);
    const summary = result[0].content;
    const bulletPoints = summary.split('\n').filter((l: string) => l.startsWith('- '));
    expect(bulletPoints.length).toBeLessThanOrEqual(10);
  });

  it('summary uses timestamp from first older message', () => {
    const messages = Array.from({ length: 50 }, (_, i) => {
      const msg = makeMessage(
        i % 2 === 0 ? 'user' : 'assistant',
        `message ${i}`
      );
      msg.timestamp = 1000 + i;
      return msg;
    });
    const result = compactConversation(messages);
    expect(result[0].timestamp).toBe(1000);
  });
});
