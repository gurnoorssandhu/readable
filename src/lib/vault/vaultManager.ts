import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { VaultNote } from '@/types/vault';

const VAULT_ROOT = path.join(process.cwd(), 'readable-vault');

export function getVaultRoot(): string {
  return VAULT_ROOT;
}

export function vaultPath(...segments: string[]): string {
  return path.join(VAULT_ROOT, ...segments);
}

/**
 * Ensure the vault directory structure exists.
 * Creates PDFs/, Concepts/, Questions/, and .obsidian/ if missing.
 */
export async function ensureVaultStructure(): Promise<void> {
  const dirs = [
    VAULT_ROOT,
    vaultPath('.obsidian'),
    vaultPath('PDFs'),
    vaultPath('Concepts'),
    vaultPath('Questions'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Ensure MOC.md exists
  const mocPath = vaultPath('MOC.md');
  try {
    await fs.access(mocPath);
  } catch {
    const mocFrontmatter = { type: 'moc', updated: '' };
    const mocContent = `# Readable - Map of Content

## PDFs

_No PDFs added yet._

## Recent Sessions

_No sessions yet._

## Concepts

_No concepts extracted yet._

## Questions

_No questions raised yet._`;
    await writeNote('MOC.md', mocFrontmatter, mocContent);
  }
}

/**
 * Read a markdown file from the vault, parsing its YAML frontmatter.
 * The path is relative to the vault root.
 */
export async function readNote(notePath: string): Promise<VaultNote> {
  const fullPath = vaultPath(notePath);
  const raw = await fs.readFile(fullPath, 'utf-8');
  const parsed = matter(raw);

  const noteType = inferNoteType(notePath, parsed.data);

  return {
    path: notePath,
    type: noteType,
    frontmatter: parsed.data as Record<string, unknown>,
    content: parsed.content.trim(),
  };
}

/**
 * Write a markdown file with YAML frontmatter to the vault.
 * The path is relative to the vault root.
 */
export async function writeNote(
  notePath: string,
  frontmatter: Record<string, unknown>,
  content: string
): Promise<void> {
  const fullPath = vaultPath(notePath);

  // Ensure the parent directory exists
  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });

  const fileContent = matter.stringify(content, frontmatter);
  await fs.writeFile(fullPath, fileContent, 'utf-8');
}

/**
 * List all .md files in a directory (relative to vault root).
 * Returns parsed VaultNote objects.
 */
export async function listNotes(directory: string): Promise<VaultNote[]> {
  const fullDir = vaultPath(directory);

  let entries: string[];
  try {
    entries = await fs.readdir(fullDir);
  } catch {
    return [];
  }

  const mdFiles = entries.filter((f) => f.endsWith('.md'));
  const notes: VaultNote[] = [];

  for (const file of mdFiles) {
    const notePath = path.join(directory, file);
    try {
      const note = await readNote(notePath);
      notes.push(note);
    } catch {
      // Skip files that can't be parsed
    }
  }

  return notes;
}

/**
 * Get all notes associated with a PDF (index + sessions + any nested notes).
 */
export async function getPdfNotes(pdfSlug: string): Promise<VaultNote[]> {
  const pdfDir = path.join('PDFs', pdfSlug);
  const notes: VaultNote[] = [];

  // Read the _index.md if it exists
  try {
    const indexNote = await readNote(path.join(pdfDir, '_index.md'));
    notes.push(indexNote);
  } catch {
    // No index note yet
  }

  // Read session notes
  const sessionNotes = await getSessionNotes(pdfSlug);
  notes.push(...sessionNotes);

  return notes;
}

/**
 * Get session notes for a specific PDF.
 */
export async function getSessionNotes(pdfSlug: string): Promise<VaultNote[]> {
  const sessionsDir = path.join('PDFs', pdfSlug, 'sessions');
  return listNotes(sessionsDir);
}

/**
 * List all concept notes.
 */
export async function getConceptNotes(): Promise<VaultNote[]> {
  return listNotes('Concepts');
}

/**
 * List all question notes.
 */
export async function getQuestionNotes(): Promise<VaultNote[]> {
  return listNotes('Questions');
}

/**
 * Infer the note type from its path and frontmatter.
 */
function inferNoteType(
  notePath: string,
  frontmatter: Record<string, unknown>
): VaultNote['type'] {
  if (frontmatter.type) {
    const t = String(frontmatter.type);
    if (['pdf-index', 'session', 'concept', 'question', 'moc'].includes(t)) {
      return t as VaultNote['type'];
    }
  }

  if (notePath === 'MOC.md') return 'moc';
  if (notePath.includes('sessions/')) return 'session';
  if (notePath.startsWith('Concepts/')) return 'concept';
  if (notePath.startsWith('Questions/')) return 'question';
  if (notePath.endsWith('_index.md') && notePath.startsWith('PDFs/'))
    return 'pdf-index';

  return 'concept'; // fallback
}
