export async function executeBraveSearch(
  query: string,
  count: number = 5
): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    return 'Web search is not available \u2014 BRAVE_SEARCH_API_KEY not configured';
  }

  const clampedCount = Math.min(Math.max(1, count), 10);

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(clampedCount),
    });

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!response.ok) {
      return `Web search failed with status ${response.status}: ${response.statusText}`;
    }

    const data = await response.json();

    const results = data.web?.results;
    if (!results || results.length === 0) {
      return `No results found for query: "${query}"`;
    }

    const formatted = results
      .map(
        (r: { title?: string; url?: string; description?: string }, i: number) =>
          `${i + 1}. ${r.title || 'Untitled'}\n   URL: ${r.url || ''}\n   ${r.description || 'No description'}`
      )
      .join('\n\n');

    return `Search results for "${query}":\n\n${formatted}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return `Web search failed: ${message}`;
  }
}
