import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import type { Session, SessionCreateResponse } from '@/types/session';
import { generateId } from '@/lib/utils';
import {
  ensureVaultStructure,
  getSessionNotes,
  getConceptNotes,
} from '@/lib/vault/vaultManager';

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions');

async function ensureSessionsDir(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

/**
 * POST /api/session
 * Create a new co-reading session.
 * Body: { pdfId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfId } = body;

    if (!pdfId || typeof pdfId !== 'string') {
      return NextResponse.json(
        { error: 'pdfId is required' },
        { status: 400 }
      );
    }

    await ensureSessionsDir();

    const sessionId = generateId();
    const session: Session = {
      id: sessionId,
      pdfId,
      startedAt: new Date().toISOString(),
      status: 'active',
      viewedPages: [],
      messages: [],
    };

    const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    await writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf-8');

    // Load vault context for this PDF
    let vaultContext = '';
    const priorConcepts: string[] = [];
    try {
      await ensureVaultStructure();

      // Look up the PDF slug from the library index
      const pdfIndexPath = path.join(process.cwd(), 'data', 'pdfs', 'index.json');
      const pdfIndexRaw = await readFile(pdfIndexPath, 'utf-8');
      const pdfIndex = JSON.parse(pdfIndexRaw) as { pdfs: Array<{ id: string; slug: string }> };
      const pdfEntry = pdfIndex.pdfs.find((p) => p.id === pdfId);
      const pdfSlug = pdfEntry?.slug;

      if (pdfSlug) {
        const parts: string[] = [];

        // Load prior session summaries
        const sessionNotes = await getSessionNotes(pdfSlug);
        if (sessionNotes.length > 0) {
          const sessionSummaries = sessionNotes.map((note) => {
            const date = (note.frontmatter.date as string) || 'unknown date';
            const sid = (note.frontmatter.sessionId as string) || path.basename(note.path, '.md');
            return `### Session ${sid} (${date})\n${note.content}`;
          });
          parts.push(`## Prior Sessions\n\n${sessionSummaries.join('\n\n---\n\n')}`);
        }

        // Load concept notes
        const conceptNotes = await getConceptNotes();
        if (conceptNotes.length > 0) {
          const conceptSummaries = conceptNotes.map((note) => {
            const title = (note.frontmatter.title as string) || path.basename(note.path, '.md');
            priorConcepts.push(title);
            return `### ${title}\n${note.content}`;
          });
          parts.push(`## Concepts\n\n${conceptSummaries.join('\n\n---\n\n')}`);
        }

        vaultContext = parts.join('\n\n');
      }
    } catch (err) {
      // Non-fatal: proceed with empty vault context
      console.warn('Failed to load vault context for session:', err);
    }

    const response: SessionCreateResponse = {
      sessionId,
      vaultContext,
      priorConcepts,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error('Session creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/session
 * List all sessions. Optional query param ?pdfId= to filter.
 */
export async function GET(request: NextRequest) {
  try {
    await ensureSessionsDir();

    const { searchParams } = request.nextUrl;
    const filterPdfId = searchParams.get('pdfId');

    const files = await readdir(SESSIONS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const sessions: Session[] = [];
    for (const file of jsonFiles) {
      try {
        const raw = await readFile(path.join(SESSIONS_DIR, file), 'utf-8');
        const session = JSON.parse(raw) as Session;

        if (!filterPdfId || session.pdfId === filterPdfId) {
          sessions.push(session);
        }
      } catch {
        // Skip corrupt session files
      }
    }

    // Sort by startedAt descending (most recent first)
    sessions.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('Session list error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list sessions' },
      { status: 500 }
    );
  }
}
