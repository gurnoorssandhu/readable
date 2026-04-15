import { readFile } from 'fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export async function extractPageText(
  pdfPath: string,
  pageNumber: number
): Promise<string> {
  const fileBuffer = await readFile(pdfPath);
  const data = new Uint8Array(fileBuffer);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  if (pageNumber < 1 || pageNumber > doc.numPages) {
    doc.destroy();
    throw new Error(
      `Page ${pageNumber} out of range (1-${doc.numPages})`
    );
  }

  const page = await doc.getPage(pageNumber);
  const textContent = await page.getTextContent();

  const text = textContent.items
    .filter((item): item is TextItem => 'str' in item)
    .map((item) => item.str)
    .join(' ');

  doc.destroy();
  return text;
}

export async function extractPagesText(
  pdfPath: string,
  startPage: number,
  endPage: number
): Promise<Map<number, string>> {
  const fileBuffer = await readFile(pdfPath);
  const data = new Uint8Array(fileBuffer);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  const clampedStart = Math.max(1, startPage);
  const clampedEnd = Math.min(doc.numPages, endPage);
  const result = new Map<number, string>();

  for (let pageNum = clampedStart; pageNum <= clampedEnd; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const text = textContent.items
      .filter((item): item is TextItem => 'str' in item)
      .map((item) => item.str)
      .join(' ');

    result.set(pageNum, text);
  }

  doc.destroy();
  return result;
}
