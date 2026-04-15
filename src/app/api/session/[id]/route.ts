import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { Session, ChatMessage } from '@/types/session';
import type { PdfMeta, PdfLibraryIndex } from '@/types/pdf';
import { condenseSession } from '@/lib/vault/condenser';

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions');

function sessionPath(id: string): string {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

async function loadSession(id: string): Promise<Session | null> {
  try {
    const raw = await readFile(sessionPath(id), 'utf-8');
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

async function saveSession(session: Session): Promise<void> {
  await writeFile(
    sessionPath(session.id),
    JSON.stringify(session, null, 2),
    'utf-8'
  );
}

/**
 * GET /api/session/[id]
 * Load a single session by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await loadSession(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session });
}

/**
 * PATCH /api/session/[id]
 * Update a session.
 * Body: { action: 'end' | 'addMessage', viewedPages?: number[], message?: ChatMessage }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await loadSession(id);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, viewedPages, message } = body as {
      action: 'end' | 'addMessage';
      viewedPages?: number[];
      message?: ChatMessage;
    };

    if (action === 'end') {
      session.status = 'ended';
      session.endedAt = new Date().toISOString();

      // Merge any final viewed pages
      if (viewedPages && Array.isArray(viewedPages)) {
        const merged = new Set([...session.viewedPages, ...viewedPages]);
        session.viewedPages = Array.from(merged).sort((a, b) => a - b);
      }
    } else if (action === 'addMessage') {
      if (!message) {
        return NextResponse.json(
          { error: 'message is required for addMessage action' },
          { status: 400 }
        );
      }
      session.messages.push(message);

      // Also merge viewed pages if provided alongside a message
      if (viewedPages && Array.isArray(viewedPages)) {
        const merged = new Set([...session.viewedPages, ...viewedPages]);
        session.viewedPages = Array.from(merged).sort((a, b) => a - b);
      }
    } else {
      return NextResponse.json(
        { error: 'action must be "end" or "addMessage"' },
        { status: 400 }
      );
    }

    await saveSession(session);

    // Trigger vault condensation after ending a session
    if (action === 'end') {
      try {
        const pdfIndexPath = path.join(process.cwd(), 'data', 'pdfs', 'index.json');
        const pdfIndexRaw = await readFile(pdfIndexPath, 'utf-8');
        const pdfIndex: PdfLibraryIndex = JSON.parse(pdfIndexRaw);
        const pdfMeta: PdfMeta | undefined = pdfIndex.pdfs.find(
          (p) => p.id === session.pdfId
        );

        if (pdfMeta) {
          await condenseSession(session, pdfMeta);
        } else {
          console.warn(`PDF meta not found for pdfId=${session.pdfId}, skipping condensation`);
        }
      } catch (condensErr) {
        // Condensation failure should not block session end
        console.error('Vault condensation failed (non-blocking):', condensErr);
      }
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error('Session update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update session' },
      { status: 500 }
    );
  }
}
