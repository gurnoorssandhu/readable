import { create } from 'zustand';
import { PdfMeta } from '@/types/pdf';

interface OutlineItem {
  title: string;
  pageNumber: number;
  level: number;
}

interface PdfState {
  pdfId: string | null;
  pdfMeta: PdfMeta | null;
  zoom: number;
  currentPage: number;
  pdfLibrary: PdfMeta[];
  tocOpen: boolean;
  tocTab: 'thumbnails' | 'outline';
  outline: OutlineItem[];

  setPdf: (id: string, meta: PdfMeta) => void;
  setZoom: (z: number) => void;
  setCurrentPage: (p: number) => void;
  setLibrary: (library: PdfMeta[]) => void;
  clearPdf: () => void;
  toggleToc: () => void;
  setTocOpen: (open: boolean) => void;
  setTocTab: (tab: 'thumbnails' | 'outline') => void;
  setOutline: (outline: OutlineItem[]) => void;
  scrollToPage: number | null;
  setScrollToPage: (page: number | null) => void;
}

export const usePdfStore = create<PdfState>((set) => ({
  pdfId: null,
  pdfMeta: null,
  zoom: 1.0,
  currentPage: 1,
  pdfLibrary: [],
  tocOpen: false,
  tocTab: 'thumbnails',
  outline: [],
  scrollToPage: null,

  setPdf: (id, meta) => set({ pdfId: id, pdfMeta: meta, currentPage: 1 }),
  setZoom: (z) => set({ zoom: Math.max(0.5, Math.min(3.0, z)) }),
  setCurrentPage: (p) => set({ currentPage: p }),
  setLibrary: (library) => set({ pdfLibrary: library }),
  clearPdf: () => set({ pdfId: null, pdfMeta: null, currentPage: 1, zoom: 1.0 }),
  toggleToc: () => set((s) => ({ tocOpen: !s.tocOpen })),
  setTocOpen: (open) => set({ tocOpen: open }),
  setTocTab: (tab) => set({ tocTab: tab }),
  setOutline: (outline) => set({ outline }),
  setScrollToPage: (page) => set({ scrollToPage: page }),
}));
