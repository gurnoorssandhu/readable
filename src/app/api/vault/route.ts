import { NextRequest, NextResponse } from 'next/server';
import { VaultContext } from '@/types/vault';
import {
  ensureVaultStructure,
  getSessionNotes,
  getConceptNotes,
  getQuestionNotes,
  readNote,
} from '@/lib/vault/vaultManager';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/vault?pdfId=<pdfId>
 *
 * Load vault context for the given PDF: prior session summaries,
 * concept notes, question notes. Returns a VaultContext object.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfId = searchParams.get('pdfId');

    if (!pdfId) {
      return NextResponse.json(
        { error: 'Missing pdfId query parameter' },
        { status: 400 }
      );
    }

    await ensureVaultStructure();

    // Look up PDF slug from the index
    const pdfSlug = await findPdfSlug(pdfId);

    if (!pdfSlug) {
      // No vault data for this PDF yet - return empty context
      const emptyContext: VaultContext = {
        pdfSummary: '',
        priorSessions: [],
        concepts: [],
        questions: [],
        fullText: '',
      };
      return NextResponse.json(emptyContext);
    }

    // Load session summaries
    const sessionNotes = await getSessionNotes(pdfSlug);
    const priorSessions = sessionNotes.map((note) => {
      const date = note.frontmatter.date || 'unknown date';
      return `### Session ${note.frontmatter.sessionId || path.basename(note.path, '.md')} (${date})\n\n${note.content}`;
    });

    // Load PDF index summary
    let pdfSummary = '';
    try {
      const pdfIndex = await readNote(path.join('PDFs', pdfSlug, '_index.md'));
      pdfSummary = pdfIndex.content;
    } catch {
      // No PDF index yet
    }

    // Load concept notes
    const conceptNotes = await getConceptNotes();
    const concepts = conceptNotes.map((note) => {
      const title = (note.frontmatter.title as string) || path.basename(note.path, '.md');
      return `### ${title}\n\n${note.content}`;
    });

    // Load question notes
    const questionNotes = await getQuestionNotes();
    const questions = questionNotes.map((note) => {
      const title = (note.frontmatter.title as string) || path.basename(note.path, '.md');
      const status = (note.frontmatter.status as string) || 'open';
      return `### ${title} [${status}]\n\n${note.content}`;
    });

    // Build full text representation for context injection
    const fullTextParts: string[] = [];
    if (pdfSummary) {
      fullTextParts.push(`## PDF Overview\n\n${pdfSummary}`);
    }
    if (priorSessions.length > 0) {
      fullTextParts.push(`## Prior Sessions\n\n${priorSessions.join('\n\n---\n\n')}`);
    }
    if (concepts.length > 0) {
      fullTextParts.push(`## Concepts\n\n${concepts.join('\n\n---\n\n')}`);
    }
    if (questions.length > 0) {
      fullTextParts.push(`## Open Questions\n\n${questions.join('\n\n---\n\n')}`);
    }

    const context: VaultContext = {
      pdfSummary,
      priorSessions,
      concepts,
      questions,
      fullText: fullTextParts.join('\n\n'),
    };

    return NextResponse.json(context);
  } catch (error) {
    console.error('Error loading vault context:', error);
    return NextResponse.json(
      { error: 'Failed to load vault context' },
      { status: 500 }
    );
  }
}

/**
 * Find the PDF slug for a given pdfId by scanning PDF index files.
 */
async function findPdfSlug(pdfId: string): Promise<string | null> {
  const pdfsDir = path.join(process.cwd(), 'readable-vault', 'PDFs');

  let entries: string[];
  try {
    entries = await fs.readdir(pdfsDir);
  } catch {
    return null;
  }

  for (const entry of entries) {
    const indexPath = path.join('PDFs', entry, '_index.md');
    try {
      const note = await readNote(indexPath);
      if (note.frontmatter.pdfId === pdfId) {
        return entry;
      }
    } catch {
      // Skip directories without an index
    }
  }

  return null;
}
