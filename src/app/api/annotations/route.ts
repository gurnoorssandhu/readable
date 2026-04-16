import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ANNOTATIONS_DIR = path.join(process.cwd(), 'data', 'annotations');

async function ensureDir() {
  await mkdir(ANNOTATIONS_DIR, { recursive: true });
}

// GET /api/annotations?pdfId=xxx
export async function GET(request: NextRequest) {
  const pdfId = request.nextUrl.searchParams.get('pdfId');
  if (!pdfId) {
    return NextResponse.json({ error: 'pdfId required' }, { status: 400 });
  }

  await ensureDir();
  const filePath = path.join(ANNOTATIONS_DIR, `${pdfId}.json`);

  try {
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json({ strokes: data.strokes ?? [] });
  } catch {
    return NextResponse.json({ strokes: [] });
  }
}

// POST /api/annotations
// Body: { pdfId: string, strokes: Stroke[] }
export async function POST(request: NextRequest) {
  try {
    const { pdfId, strokes } = await request.json();
    if (!pdfId) {
      return NextResponse.json({ error: 'pdfId required' }, { status: 400 });
    }

    await ensureDir();
    const filePath = path.join(ANNOTATIONS_DIR, `${pdfId}.json`);
    const data = {
      pdfId,
      strokes: strokes ?? [],
      updatedAt: new Date().toISOString(),
    };
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 }
    );
  }
}
