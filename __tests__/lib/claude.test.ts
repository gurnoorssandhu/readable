/* Mock the Anthropic SDK before any import triggers the constructor.
   The jest.config uses testEnvironment: 'jsdom', which the real SDK
   rejects ("browser-like environment"). A lightweight mock avoids that.
   The SDK exports both a default class and a callable module.exports,
   so we mock the entire module path to avoid any constructor side-effects. */
jest.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = jest.fn().mockImplementation(() => ({ mocked: true }));
  // The SDK assigns module.exports = function, so we mimic that shape
  MockAnthropic.prototype = {};
  const mod = Object.assign(MockAnthropic, {
    __esModule: true,
    default: MockAnthropic,
    Anthropic: MockAnthropic,
    BaseAnthropic: MockAnthropic,
  });
  return mod;
});

beforeAll(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

import {
  CO_READING_SYSTEM_PROMPT,
  TOOL_DEFINITIONS,
  anthropicClient,
} from '@/lib/claude';

describe('CO_READING_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof CO_READING_SYSTEM_PROMPT).toBe('string');
    expect(CO_READING_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('contains key phrase "co-reading"', () => {
    expect(CO_READING_SYSTEM_PROMPT.toLowerCase()).toContain('co-reading');
  });

  it('contains key phrase "faithful"', () => {
    expect(CO_READING_SYSTEM_PROMPT.toLowerCase()).toContain('faithful');
  });
});

describe('TOOL_DEFINITIONS', () => {
  it('is an array with exactly 2 tools', () => {
    expect(Array.isArray(TOOL_DEFINITIONS)).toBe(true);
    expect(TOOL_DEFINITIONS).toHaveLength(2);
  });

  it('has a "brave_search" tool with required input "query"', () => {
    const braveTool = TOOL_DEFINITIONS.find((t) => t.name === 'brave_search');
    expect(braveTool).toBeDefined();
    expect(braveTool!.input_schema).toBeDefined();

    const schema = braveTool!.input_schema as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(schema.required).toContain('query');
    expect(schema.properties).toHaveProperty('query');
  });

  it('has a "read_file" tool with required input "file_path"', () => {
    const readFileTool = TOOL_DEFINITIONS.find((t) => t.name === 'read_file');
    expect(readFileTool).toBeDefined();
    expect(readFileTool!.input_schema).toBeDefined();

    const schema = readFileTool!.input_schema as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(schema.required).toContain('file_path');
    expect(schema.properties).toHaveProperty('file_path');
  });
});

describe('anthropicClient', () => {
  it('is defined', () => {
    expect(anthropicClient).toBeTruthy();
  });
});
