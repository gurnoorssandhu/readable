import { readNote, writeNote, vaultPath } from './vaultManager';
import fs from 'fs/promises';
import { formatDate } from '@/lib/utils';

/**
 * Extract all [[wiki-link]] patterns from markdown content.
 * Returns the link targets (text inside the brackets).
 */
export function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return links;
}

/**
 * Append a backlink reference to a note.
 * Adds a "Backlinks" section if one doesn't exist, then appends the new backlink.
 */
export async function addBacklink(
  notePath: string,
  backlinkTarget: string,
  context: string
): Promise<void> {
  let note;
  try {
    note = await readNote(notePath);
  } catch {
    // Note doesn't exist yet; nothing to add a backlink to
    return;
  }

  const backlinkEntry = `- [[${backlinkTarget}]]: ${context}`;

  let updatedContent: string;
  if (note.content.includes('## Backlinks')) {
    // Append under existing Backlinks section
    updatedContent = note.content.replace(
      /(## Backlinks\n)/,
      `$1${backlinkEntry}\n`
    );
  } else {
    // Add a new Backlinks section at the end
    updatedContent = `${note.content}\n\n## Backlinks\n${backlinkEntry}`;
  }

  await writeNote(notePath, note.frontmatter, updatedContent);
}

/**
 * Update MOC.md with new entries under the appropriate sections.
 * Each entry is a wiki-link target (note title or path stem).
 */
export async function updateMOC(newEntries: {
  pdfs?: string[];
  sessions?: string[];
  concepts?: string[];
  questions?: string[];
}): Promise<void> {
  const mocPath = 'MOC.md';
  let moc;
  try {
    moc = await readNote(mocPath);
  } catch {
    // MOC doesn't exist; create a minimal one
    moc = {
      path: mocPath,
      type: 'moc' as const,
      frontmatter: { type: 'moc', updated: '' },
      content: `# Readable - Map of Content

## PDFs

_No PDFs added yet._

## Recent Sessions

_No sessions yet._

## Concepts

_No concepts extracted yet._

## Questions

_No questions raised yet._`,
    };
  }

  let content = moc.content;

  if (newEntries.pdfs?.length) {
    content = insertEntriesInSection(content, '## PDFs', newEntries.pdfs);
  }

  if (newEntries.sessions?.length) {
    content = insertEntriesInSection(
      content,
      '## Recent Sessions',
      newEntries.sessions
    );
  }

  if (newEntries.concepts?.length) {
    content = insertEntriesInSection(
      content,
      '## Concepts',
      newEntries.concepts
    );
  }

  if (newEntries.questions?.length) {
    content = insertEntriesInSection(
      content,
      '## Questions',
      newEntries.questions
    );
  }

  const updatedFrontmatter = {
    ...moc.frontmatter,
    updated: formatDate(new Date()),
  };

  await writeNote(mocPath, updatedFrontmatter, content);
}

/**
 * Insert wiki-link entries into a specific section of the MOC content.
 * Removes the "_No ... yet._" placeholder if present, then appends entries.
 */
function insertEntriesInSection(
  content: string,
  sectionHeader: string,
  entries: string[]
): string {
  const lines = content.split('\n');
  const sectionIndex = lines.findIndex((line) => line.trim() === sectionHeader);

  if (sectionIndex === -1) {
    // Section not found; append it at the end
    const newSection = [
      '',
      sectionHeader,
      '',
      ...entries.map((e) => `- [[${e}]]`),
    ].join('\n');
    return content + newSection;
  }

  // Find the range of this section (until next ## heading or end of file)
  let nextSectionIndex = lines.length;
  for (let i = sectionIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      nextSectionIndex = i;
      break;
    }
  }

  // Collect existing entries in this section (non-empty, non-header, non-placeholder lines)
  const sectionLines = lines.slice(sectionIndex + 1, nextSectionIndex);
  const existingEntries = new Set(
    sectionLines
      .filter((l) => l.startsWith('- [['))
      .map((l) => {
        const match = l.match(/\[\[([^\]]+)\]\]/);
        return match ? match[1] : '';
      })
      .filter(Boolean)
  );

  // Filter out entries that already exist
  const newEntries = entries.filter((e) => !existingEntries.has(e));
  if (newEntries.length === 0) return content;

  // Remove placeholder text
  const filteredSectionLines = sectionLines.filter(
    (l) => !l.match(/^_No .+ yet\._$/)
  );

  // Rebuild the section
  const rebuiltSection = [
    sectionHeader,
    '',
    ...filteredSectionLines.filter((l) => l.trim() !== ''),
    ...newEntries.map((e) => `- [[${e}]]`),
    '',
  ];

  const result = [
    ...lines.slice(0, sectionIndex),
    ...rebuiltSection,
    ...lines.slice(nextSectionIndex),
  ];

  return result.join('\n');
}
