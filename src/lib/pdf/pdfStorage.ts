import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PdfMeta, PdfLibraryIndex } from '@/types/pdf';
import { generateId, generateSlug } from '@/lib/utils';

const DATA_DIR = path.join(process.cwd(), 'data', 'pdfs');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readIndex(): Promise<PdfLibraryIndex> {
  try {
    const raw = await readFile(INDEX_PATH, 'utf-8');
    return JSON.parse(raw) as PdfLibraryIndex;
  } catch {
    return { pdfs: [] };
  }
}

async function writeIndex(index: PdfLibraryIndex): Promise<void> {
  await writeFile(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
}

export async function savePdf(file: Buffer, fileName: string): Promise<PdfMeta> {
  await ensureDataDir();

  const id = generateId();
  const pdfFileName = `${id}.pdf`;
  const filePath = path.join(DATA_DIR, pdfFileName);

  // Write the PDF file to disk
  await writeFile(filePath, file);

  // Extract page count using pdfjs-dist
  let pageCount = 0;
  try {
    const data = new Uint8Array(file);
    const doc = await getDocument({ data, useSystemFonts: true }).promise;
    pageCount = doc.numPages;
    doc.destroy();
  } catch (err) {
    console.error('Failed to extract PDF page count:', err);
  }

  // Derive a title from the filename (strip extension)
  const title = fileName.replace(/\.pdf$/i, '');
  const slug = generateSlug(title);

  const meta: PdfMeta = {
    id,
    fileName,
    title,
    authors: [],
    pageCount,
    uploadedAt: new Date().toISOString(),
    slug,
    filePath: pdfFileName,
  };

  // Update the index
  const index = await readIndex();
  index.pdfs.push(meta);
  await writeIndex(index);

  return meta;
}

export async function getPdfIndex(): Promise<PdfMeta[]> {
  const index = await readIndex();
  return index.pdfs;
}

export function getPdfPath(id: string): string {
  return path.join(DATA_DIR, `${id}.pdf`);
}

export async function deletePdf(id: string): Promise<void> {
  const filePath = getPdfPath(id);

  // Remove the file from disk
  try {
    await unlink(filePath);
  } catch {
    // File may already be deleted; continue to clean up index
  }

  // Remove entry from index
  const index = await readIndex();
  index.pdfs = index.pdfs.filter((pdf) => pdf.id !== id);
  await writeIndex(index);
}
