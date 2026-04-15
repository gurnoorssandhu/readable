import { create } from 'zustand';
import { PdfMeta } from '@/types/pdf';

interface PdfState {
  pdfId: string | null;
  pdfMeta: PdfMeta | null;
  zoom: number;
  currentPage: number;
  pdfLibrary: PdfMeta[];

  setPdf: (id: string, meta: PdfMeta) => void;
  setZoom: (z: number) => void;
  setCurrentPage: (p: number) => void;
  setLibrary: (library: PdfMeta[]) => void;
  clearPdf: () => void;
}

export const usePdfStore = create<PdfState>((set) => ({
  pdfId: null,
  pdfMeta: null,
  zoom: 1.0,
  currentPage: 1,
  pdfLibrary: [],

  setPdf: (id, meta) => set({ pdfId: id, pdfMeta: meta, currentPage: 1 }),
  setZoom: (z) => set({ zoom: Math.max(0.5, Math.min(3.0, z)) }),
  setCurrentPage: (p) => set({ currentPage: p }),
  setLibrary: (library) => set({ pdfLibrary: library }),
  clearPdf: () => set({ pdfId: null, pdfMeta: null, currentPage: 1, zoom: 1.0 }),
}));
