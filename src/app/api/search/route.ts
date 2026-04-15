import { NextRequest } from 'next/server';
import { executeBraveSearch } from '@/lib/tools/braveSearch';

export async function POST(request: NextRequest) {
  try {
    const { query, count } = await request.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await executeBraveSearch(query, count);

    return new Response(JSON.stringify({ result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Search failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
