import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Session } from '@/types/session';
import { PdfMeta, PdfLibraryIndex } from '@/types/pdf';
import { condenseSession } from '@/lib/vault/condenser';

/**
 * POST /api/vault/condense
 *
 * Body: { sessionId: string, pdfId: string }
 *
 * Loads the session and PDF metadata from disk, runs the condensation
 * pipeline, and returns the list of written files.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, pdfId } = body;

    if (!sessionId || !pdfId) {
      return NextResponse.json(
        { error: 'Missing sessionId or pdfId in request body' },
        { status: 400 }
      );
    }

    // Load session from data/sessions/<id>.json
    const sessionPath = path.join(
      process.cwd(),
      'data',
      'sessions',
      `${sessionId}.json`
    );

    let session: Session;
    try {
      const sessionRaw = await fs.readFile(sessionPath, 'utf-8');
      session = JSON.parse(sessionRaw) as Session;
    } catch {
      return NextResponse.json(
        { error: `Session not found: ${sessionId}` },
        { status: 404 }
      );
    }

    // Load PDF metadata from data/pdfs/index.json
    const pdfIndexPath = path.join(
      process.cwd(),
      'data',
      'pdfs',
      'index.json'
    );

    let pdfMeta: PdfMeta | undefined;
    try {
      const pdfIndexRaw = await fs.readFile(pdfIndexPath, 'utf-8');
      const pdfIndex = JSON.parse(pdfIndexRaw) as PdfLibraryIndex;
      pdfMeta = pdfIndex.pdfs.find((p) => p.id === pdfId);
    } catch {
      return NextResponse.json(
        { error: 'PDF index not found' },
        { status: 404 }
      );
    }

    if (!pdfMeta) {
      return NextResponse.json(
        { error: `PDF not found: ${pdfId}` },
        { status: 404 }
      );
    }

    // Run condensation pipeline
    const result = await condenseSession(session, pdfMeta);

    // Collect all written file paths
    const files: string[] = [result.sessionNote.path];
    for (const concept of result.concepts) {
      files.push(`Concepts/${concept.slug}.md`);
    }
    for (const question of result.questions) {
      files.push(`Questions/${question.slug}.md`);
    }

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('Error condensing session:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Condensation failed: ${message}` },
      { status: 500 }
    );
  }
}
