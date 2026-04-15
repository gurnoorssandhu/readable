import type { ChatMessage } from '@/types/session';
import type { Snapshot } from '@/types/pdf';
import { DEFAULT_CONTEXT_BUDGET } from '@/types/chat';

// Mock @/lib/claude to provide a simple system prompt (avoids importing
// the Anthropic SDK which is not needed in unit tests).
jest.mock('@/lib/claude', () => ({
  CO_READING_SYSTEM_PROMPT: 'You are a test co-reading assistant.',
}));

// Mock @/lib/utils to avoid transitive ESM imports (uuid, date-fns)
// while keeping the token-related helpers with their real logic.
jest.mock('@/lib/utils', () => ({
  generateId: () => 'mock-id',
  generateSlug: (t: string) => t,
  formatDate: () => '2026-01-01',
  formatDateTime: () => '2026-01-01 00:00:00',
  estimateTokens: (text: string) => Math.ceil(text.length / 4),
  estimateImageTokens: (w: number, h: number) => Math.ceil((w * h) / 750),
  truncateToTokenBudget: (text: string, maxTokens: number) => {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '\n\n[...truncated]';
  },
  fileToBase64: () => Promise.resolve(''),
}));

import { buildSystemPrompt, buildContext, BuildContextParams } from '@/lib/context/contextBuilder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChatMessage(
  overrides: Partial<ChatMessage> & { role: ChatMessage['role']; content: string }
): ChatMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeSnapshot(overrides?: Partial<Snapshot>): Snapshot {
  return {
    imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB',
    pageNumber: 1,
    rect: { x: 0, y: 0, w: 100, h: 100 },
    timestamp: Date.now(),
    ...overrides,
  };
}

function defaultParams(overrides?: Partial<BuildContextParams>): BuildContextParams {
  return {
    messages: [],
    viewedPages: [],
    visiblePages: [],
    pdfId: 'test-pdf-id',
    pageTexts: new Map(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildSystemPrompt', () => {
  it('returns the base system prompt when no vault context is given', () => {
    const result = buildSystemPrompt();
    expect(result).toBe('You are a test co-reading assistant.');
  });

  it('returns the base prompt unchanged when vault context is empty or whitespace', () => {
    expect(buildSystemPrompt('')).toBe('You are a test co-reading assistant.');
    expect(buildSystemPrompt('   ')).toBe('You are a test co-reading assistant.');
  });

  it('appends vault context with the correct header', () => {
    const vaultCtx = 'The Euler equation describes fluid dynamics.';
    const result = buildSystemPrompt(vaultCtx);
    expect(result).toContain('You are a test co-reading assistant.');
    expect(result).toContain('--- Prior Knowledge Context ---');
    expect(result).toContain(vaultCtx);
  });

  it('truncates vault context that exceeds the vaultContext budget', () => {
    // The budget for vaultContext is 10 000 tokens; at ~4 chars/token that is 40 000 chars.
    const longVault = 'A'.repeat(50_000); // well over budget
    const result = buildSystemPrompt(longVault);
    expect(result).toContain('[...truncated]');
    // The truncated vault should be at most budget * 4 chars + the truncation marker
    const vaultPortion = result.split('--- Prior Knowledge Context ---\n')[1];
    expect(vaultPortion).toBeDefined();
    // The truncated text should be shorter than the original
    expect(vaultPortion!.length).toBeLessThan(longVault.length);
  });
});

describe('buildContext', () => {
  // 1) Empty messages - valid structure
  it('returns a valid structure with empty messages and no page context', () => {
    const result = buildContext(defaultParams());
    expect(result).toHaveProperty('system');
    expect(result).toHaveProperty('messages');
    expect(typeof result.system).toBe('string');
    expect(Array.isArray(result.messages)).toBe(true);
  });

  // 2) Viewed pages and page texts
  it('includes page text in the right format when viewedPages and pageTexts are provided', () => {
    const pageTexts = new Map<number, string>();
    pageTexts.set(1, 'Introduction to topology.');
    pageTexts.set(3, 'The fundamental group is defined as...');

    const result = buildContext(
      defaultParams({
        viewedPages: [3, 1], // intentionally out of order
        pageTexts,
      })
    );

    // There should be messages in the output
    expect(result.messages.length).toBeGreaterThan(0);

    // Flatten all text blocks to find page references
    const allText = JSON.stringify(result.messages);
    expect(allText).toContain('[Page 1]');
    expect(allText).toContain('[Page 3]');
    expect(allText).toContain('Introduction to topology.');
    expect(allText).toContain('The fundamental group is defined as...');
    // Pages should be sorted: page 1 before page 3
    const idx1 = allText.indexOf('[Page 1]');
    const idx3 = allText.indexOf('[Page 3]');
    expect(idx1).toBeLessThan(idx3);
  });

  // 3) Snapshot - image content block
  it('includes an image content block when a snapshot is provided', () => {
    const snapshot = makeSnapshot({ pageNumber: 5 });
    const result = buildContext(
      defaultParams({
        viewedPages: [5],
        visiblePages: [5],
        pageTexts: new Map([[5, 'Proof of Lemma 3.1']]),
        snapshot,
      })
    );

    // Find the image content block in the messages
    const allBlocks = result.messages.flatMap((m) =>
      Array.isArray(m.content)
        ? m.content
        : [{ type: 'text' as const, text: m.content as string }]
    );
    const imageBlock = allBlocks.find((b: any) => b.type === 'image');
    expect(imageBlock).toBeDefined();
    expect((imageBlock as any).source.type).toBe('base64');
    expect((imageBlock as any).source.media_type).toBe('image/png');
    expect((imageBlock as any).source.data).toBe(snapshot.imageBase64);

    // Also check that the snapshot metadata text block exists
    const snapshotText = allBlocks.find(
      (b: any) => b.type === 'text' && typeof b.text === 'string' && b.text.includes('Snapshot from page 5')
    );
    expect(snapshotText).toBeDefined();
  });

  // 4) Conversation messages alternate correctly
  it('produces alternating user/assistant messages from conversation history', () => {
    const messages: ChatMessage[] = [
      makeChatMessage({ role: 'user', content: 'What is this paper about?' }),
      makeChatMessage({ role: 'assistant', content: 'This paper discusses...' }),
      makeChatMessage({ role: 'user', content: 'Can you explain section 2?' }),
    ];

    const result = buildContext(defaultParams({ messages }));

    // Verify strict alternation
    for (let i = 1; i < result.messages.length; i++) {
      expect(result.messages[i].role).not.toBe(result.messages[i - 1].role);
    }
    // First message must be from user, last must also be from user
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[result.messages.length - 1].role).toBe('user');
  });

  // 5) Too many pages exceeding budget - truncation
  it('truncates page text when the total exceeds the pageText budget', () => {
    const pageTexts = new Map<number, string>();
    // Each page has ~20 000 chars = ~5 000 tokens. Budget is 40 000 tokens.
    // 10 pages would be 50 000 tokens, exceeding the budget.
    for (let i = 1; i <= 10; i++) {
      pageTexts.set(i, `Page ${i} content: ${'x'.repeat(20_000)}`);
    }

    const result = buildContext(
      defaultParams({
        viewedPages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        pageTexts,
      })
    );

    const allText = JSON.stringify(result.messages);

    // Not all 10 pages should appear since we exceeded the budget
    // The last few pages should be missing
    expect(allText).toContain('[Page 1]');

    // At least one page should be cut off or truncated
    // With budget = 40000 tokens = 160000 chars and each page ~20000 chars,
    // we can fit about 8 pages, so pages 9 or 10 should be missing or truncated.
    const page10Present = allText.includes('[Page 10]');
    const truncatedPresent = allText.includes('[...truncated]');
    // Either page 10 is missing, or some text was truncated
    expect(!page10Present || truncatedPresent).toBe(true);
  });

  // 6) ensureAlternating merges consecutive same-role messages
  it('merges consecutive same-role messages via ensureAlternating', () => {
    // Build a scenario that produces consecutive user messages:
    // viewedPages + pageTexts will create a context user message,
    // then we add conversation messages starting with a user message.
    // The context block creates user + assistant, and then conversation
    // adds another user message, so it should alternate fine.
    //
    // To test merging directly, we pass two consecutive user messages
    // in the conversation. We need to have an assistant message first
    // to set up context, then two users in a row.
    const messages: ChatMessage[] = [
      makeChatMessage({ role: 'user', content: 'First question' }),
      makeChatMessage({ role: 'user', content: 'Follow-up question' }),
      makeChatMessage({ role: 'assistant', content: 'Here is my answer.' }),
      makeChatMessage({ role: 'user', content: 'Thanks!' }),
    ];

    const result = buildContext(defaultParams({ messages }));

    // Verify all messages alternate
    for (let i = 1; i < result.messages.length; i++) {
      expect(result.messages[i].role).not.toBe(result.messages[i - 1].role);
    }

    // The two consecutive user messages should be merged into one
    // Find the merged message content that contains both questions
    const allText = JSON.stringify(result.messages);
    expect(allText).toContain('First question');
    expect(allText).toContain('Follow-up question');
  });

  // 7) Ensure first message starts with user if assistant comes first
  it('inserts a placeholder user message if the first message would be assistant', () => {
    const messages: ChatMessage[] = [
      makeChatMessage({ role: 'assistant', content: 'I will help you.' }),
      makeChatMessage({ role: 'user', content: 'What is chapter 1 about?' }),
    ];

    const result = buildContext(defaultParams({ messages }));

    // First message must always be user
    expect(result.messages[0].role).toBe('user');
    // Last message must also be user
    expect(result.messages[result.messages.length - 1].role).toBe('user');
  });

  // 8) Attached files are mentioned
  it('includes attached file names in the context', () => {
    const result = buildContext(
      defaultParams({
        viewedPages: [1],
        visiblePages: [1],
        pageTexts: new Map([[1, 'Some text']]),
        attachedFiles: [
          { name: 'notes.txt', contentBase64: 'dGVzdA==', mimeType: 'text/plain', size: 4 },
        ],
      })
    );

    const allText = JSON.stringify(result.messages);
    expect(allText).toContain('notes.txt');
    expect(allText).toContain('Attached files available');
  });

  // 9) vault context flows through buildContext
  it('passes vault context to the system prompt via buildContext', () => {
    const result = buildContext(
      defaultParams({
        vaultContext: 'Prior concept: Riemann surfaces.',
      })
    );

    expect(result.system).toContain('Prior Knowledge Context');
    expect(result.system).toContain('Riemann surfaces');
  });
});
