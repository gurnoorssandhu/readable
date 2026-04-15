import { NextRequest, NextResponse } from 'next/server';
import { extractPagesText } from '@/lib/pdf/extractText';
import { getPdfPath } from '@/lib/pdf/pdfStorage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const pdfId = searchParams.get('pdfId');
    const startPageStr = searchParams.get('startPage');
    const endPageStr = searchParams.get('endPage');

    if (!pdfId || !startPageStr || !endPageStr) {
      return NextResponse.json(
        { error: 'Missing required query params: pdfId, startPage, endPage' },
        { status: 400 }
      );
    }

    const startPage = parseInt(startPageStr, 10);
    const endPage = parseInt(endPageStr, 10);

    if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < startPage) {
      return NextResponse.json(
        { error: 'Invalid page range' },
        { status: 400 }
      );
    }

    const pdfPath = getPdfPath(pdfId);
    const pagesMap = await extractPagesText(pdfPath, startPage, endPage);

    // Convert Map to plain object for JSON serialisation
    const pages: Record<number, string> = {};
    for (const [pageNum, text] of pagesMap) {
      pages[pageNum] = text;
    }

    return NextResponse.json({ pages });
  } catch (err) {
    console.error('Page text extraction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to extract text' },
      { status: 500 }
    );
  }
}
