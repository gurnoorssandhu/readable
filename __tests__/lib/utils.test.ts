import {
  generateId,
  generateSlug,
  formatDate,
  formatDateTime,
  estimateTokens,
  estimateImageTokens,
  truncateToTokenBudget,
} from '@/lib/utils';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns a valid UUID v4 format', () => {
    const id = generateId();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  });

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});

describe('generateSlug', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(generateSlug('Hello, World! @2024')).toBe('hello-world-2024');
  });

  it('collapses multiple dashes into one', () => {
    expect(generateSlug('a---b')).toBe('a-b');
  });

  it('strips leading and trailing dashes', () => {
    expect(generateSlug('--hello--')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles string with only special characters', () => {
    expect(generateSlug('!@#$%^&*()')).toBe('');
  });

  it('truncates to 80 characters', () => {
    const longTitle = 'a'.repeat(100);
    expect(generateSlug(longTitle).length).toBe(80);
  });

  it('handles unicode/non-ascii characters by stripping them', () => {
    expect(generateSlug('cafe\u0301 au lait')).toBe('cafe-au-lait');
  });

  it('preserves numbers', () => {
    expect(generateSlug('Chapter 12 Section 3')).toBe('chapter-12-section-3');
  });

  it('handles multiple consecutive spaces', () => {
    expect(generateSlug('hello    world')).toBe('hello-world');
  });

  it('handles tabs and mixed whitespace', () => {
    expect(generateSlug('hello\tworld')).toBe('hello-world');
  });
});

describe('formatDate', () => {
  it('formats a Date object to yyyy-MM-dd', () => {
    const d = new Date(2024, 0, 15); // Jan 15, 2024
    expect(formatDate(d)).toBe('2024-01-15');
  });

  it('formats a date string to yyyy-MM-dd', () => {
    expect(formatDate('2024-06-01T12:30:00Z')).toBe('2024-06-01');
  });

  it('handles end of year date', () => {
    const d = new Date(2024, 11, 31); // Dec 31, 2024
    expect(formatDate(d)).toBe('2024-12-31');
  });
});

describe('formatDateTime', () => {
  it('formats a Date object to yyyy-MM-dd HH:mm:ss', () => {
    const d = new Date(2024, 0, 15, 9, 5, 30);
    expect(formatDateTime(d)).toBe('2024-01-15 09:05:30');
  });

  it('formats a date string', () => {
    const result = formatDateTime('2024-06-01T12:30:45Z');
    // The exact output depends on local timezone, but it should contain a date and time
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe('estimateTokens', () => {
  it('estimates tokens as ceil(length / 4)', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('handles single character', () => {
    expect(estimateTokens('a')).toBe(1);
  });

  it('handles very long strings', () => {
    const longStr = 'x'.repeat(10000);
    expect(estimateTokens(longStr)).toBe(2500);
  });
});

describe('estimateImageTokens', () => {
  it('estimates tokens as ceil((width * height) / 750)', () => {
    expect(estimateImageTokens(750, 1)).toBe(1);
    expect(estimateImageTokens(100, 100)).toBe(Math.ceil(10000 / 750));
  });

  it('returns 0 for zero dimensions', () => {
    expect(estimateImageTokens(0, 0)).toBe(0);
  });

  it('rounds up for non-exact divisions', () => {
    expect(estimateImageTokens(10, 10)).toBe(Math.ceil(100 / 750));
    expect(estimateImageTokens(10, 10)).toBe(1);
  });

  it('handles large images', () => {
    expect(estimateImageTokens(1920, 1080)).toBe(Math.ceil((1920 * 1080) / 750));
  });
});

describe('truncateToTokenBudget', () => {
  it('returns text unchanged if within budget', () => {
    const text = 'Hello world';
    expect(truncateToTokenBudget(text, 100)).toBe(text);
  });

  it('truncates text that exceeds budget and appends marker', () => {
    const text = 'a'.repeat(100);
    const result = truncateToTokenBudget(text, 10); // 10 tokens = 40 chars
    expect(result).toBe('a'.repeat(40) + '\n\n[...truncated]');
  });

  it('returns empty string unchanged with zero budget', () => {
    expect(truncateToTokenBudget('', 0)).toBe('');
  });

  it('handles exact boundary (text length == maxChars)', () => {
    const text = 'a'.repeat(40);
    // 10 tokens * 4 = 40 chars, text is exactly 40 chars
    expect(truncateToTokenBudget(text, 10)).toBe(text);
  });

  it('handles text one char over budget', () => {
    const text = 'a'.repeat(41);
    const result = truncateToTokenBudget(text, 10);
    expect(result).toBe('a'.repeat(40) + '\n\n[...truncated]');
  });

  it('handles very large budget', () => {
    const text = 'short';
    expect(truncateToTokenBudget(text, 1000000)).toBe(text);
  });
});
