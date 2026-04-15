import { executeBraveSearch } from '@/lib/tools/braveSearch';

describe('executeBraveSearch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.BRAVE_SEARCH_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('returns "not available" when BRAVE_SEARCH_API_KEY is not set', async () => {
    const result = await executeBraveSearch('test query');
    expect(result).toBe(
      'Web search is not available \u2014 BRAVE_SEARCH_API_KEY not configured'
    );
  });

  it('parses and formats results correctly when API returns results', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    const mockResults = {
      web: {
        results: [
          {
            title: 'First Result',
            url: 'https://example.com/1',
            description: 'Description of first result',
          },
          {
            title: 'Second Result',
            url: 'https://example.com/2',
            description: 'Description of second result',
          },
        ],
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResults,
    });

    const result = await executeBraveSearch('test query');

    expect(result).toContain('Search results for "test query"');
    expect(result).toContain('1. First Result');
    expect(result).toContain('URL: https://example.com/1');
    expect(result).toContain('Description of first result');
    expect(result).toContain('2. Second Result');
    expect(result).toContain('URL: https://example.com/2');
    expect(result).toContain('Description of second result');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(callUrl).toContain('q=test+query');
  });

  it('returns error message when API returns error status', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    const result = await executeBraveSearch('test query');
    expect(result).toBe('Web search failed with status 429: Too Many Requests');
  });

  it('returns "no results" message when API returns empty results', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    });

    const result = await executeBraveSearch('obscure query');
    expect(result).toBe('No results found for query: "obscure query"');
  });

  it('returns "no results" when web.results is missing', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await executeBraveSearch('empty query');
    expect(result).toBe('No results found for query: "empty query"');
  });

  it('clamps count to minimum of 1', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    });

    await executeBraveSearch('query', -5);

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(callUrl).toContain('count=1');
  });

  it('clamps count to maximum of 10', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    });

    await executeBraveSearch('query', 50);

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(callUrl).toContain('count=10');
  });

  it('uses default count of 5 when not specified', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    });

    await executeBraveSearch('query');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(callUrl).toContain('count=5');
  });

  it('handles fetch throwing an error', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const result = await executeBraveSearch('query');
    expect(result).toBe('Web search failed: Network failure');
  });

  it('handles results with missing title/url/description', async () => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [{ title: undefined, url: undefined, description: undefined }],
        },
      }),
    });

    const result = await executeBraveSearch('query');
    expect(result).toContain('Untitled');
    expect(result).toContain('No description');
  });
});
