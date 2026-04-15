import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'pdfs');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const fileName = segments.join('/');

  // Prevent directory traversal
  if (fileName.includes('..') || !fileName.endsWith('.pdf')) {
    return new Response('Not found', { status: 404 });
  }

  const filePath = path.join(DATA_DIR, fileName);

  try {
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
