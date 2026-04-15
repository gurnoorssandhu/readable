import { NextResponse } from 'next/server';

/**
 * Placeholder route for server-side page image rendering.
 *
 * In the MVP, PDF pages are rendered client-side via react-pdf / pdfjs-dist
 * in the browser, so this endpoint is not needed.  It exists as a stub so
 * the API surface is documented and discoverable.
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        'Server-side page rendering is not implemented. ' +
        'PDF pages are rendered client-side using react-pdf.',
    },
    { status: 501 }
  );
}
