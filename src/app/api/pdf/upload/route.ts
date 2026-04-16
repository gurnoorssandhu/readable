import { NextRequest, NextResponse } from 'next/server';
import { savePdf, getPdfIndex, deletePdf } from '@/lib/pdf/pdfStorage';

export async function GET() {
  try {
    const pdfs = await getPdfIndex();
    return NextResponse.json({ pdfs });
  } catch (err) {
    console.error('PDF list error:', err);
    return NextResponse.json({ pdfs: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF (application/pdf)' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdf = await savePdf(buffer, file.name);

    return NextResponse.json({ success: true, pdf });
  } catch (err) {
    console.error('PDF upload error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await deletePdf(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PDF delete error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
