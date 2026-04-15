export interface PdfMeta {
  id: string;
  fileName: string;
  title: string;
  authors: string[];
  pageCount: number;
  uploadedAt: string;
  slug: string;
  filePath: string;
}

export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

export interface Snapshot {
  imageBase64: string;
  pageNumber: number;
  rect: { x: number; y: number; w: number; h: number };
  timestamp: number;
}

export interface PdfLibraryIndex {
  pdfs: PdfMeta[];
}
