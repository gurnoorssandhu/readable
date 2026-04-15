import { DEFAULT_CONTEXT_BUDGET, ContextBudget } from '@/types/chat';

describe('DEFAULT_CONTEXT_BUDGET', () => {
  const expectedKeys: (keyof ContextBudget)[] = [
    'systemPrompt',
    'vaultContext',
    'pageText',
    'pageImages',
    'snapshot',
    'conversationHistory',
    'attachedFiles',
    'responseHeadroom',
  ];

  it('has all expected keys', () => {
    const actualKeys = Object.keys(DEFAULT_CONTEXT_BUDGET).sort();
    const sortedExpected = [...expectedKeys].sort();
    expect(actualKeys).toEqual(sortedExpected);
  });

  it('has all positive numbers', () => {
    for (const key of expectedKeys) {
      const value = DEFAULT_CONTEXT_BUDGET[key];
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    }
  });

  it('has a total budget that equals 150,000', () => {
    const total = Object.values(DEFAULT_CONTEXT_BUDGET).reduce(
      (sum, val) => sum + val,
      0
    );
    expect(total).toBe(150_000);
  });
});
