import { usePdfStore } from '@/store/pdfStore';
import type { PdfMeta } from '@/types/pdf';

const sampleMeta: PdfMeta = {
  id: 'pdf-1',
  fileName: 'test.pdf',
  title: 'Test PDF',
  authors: ['Author A'],
  pageCount: 10,
  uploadedAt: '2024-01-01T00:00:00Z',
  slug: 'test-pdf',
  filePath: 'pdf-1.pdf',
};

beforeEach(() => {
  // Reset the store to initial state before each test
  usePdfStore.setState({
    pdfId: null,
    pdfMeta: null,
    zoom: 1.0,
    currentPage: 1,
    pdfLibrary: [],
  });
});

describe('usePdfStore', () => {
  describe('setPdf', () => {
    it('sets the pdfId and pdfMeta', () => {
      usePdfStore.getState().setPdf('pdf-1', sampleMeta);
      const state = usePdfStore.getState();
      expect(state.pdfId).toBe('pdf-1');
      expect(state.pdfMeta).toEqual(sampleMeta);
    });

    it('resets currentPage to 1 when setting a new PDF', () => {
      usePdfStore.getState().setCurrentPage(5);
      usePdfStore.getState().setPdf('pdf-1', sampleMeta);
      expect(usePdfStore.getState().currentPage).toBe(1);
    });
  });

  describe('setZoom', () => {
    it('sets zoom to the given value', () => {
      usePdfStore.getState().setZoom(1.5);
      expect(usePdfStore.getState().zoom).toBe(1.5);
    });

    it('clamps zoom to minimum of 0.5', () => {
      usePdfStore.getState().setZoom(0.1);
      expect(usePdfStore.getState().zoom).toBe(0.5);
    });

    it('clamps zoom to minimum of 0.5 for negative values', () => {
      usePdfStore.getState().setZoom(-1);
      expect(usePdfStore.getState().zoom).toBe(0.5);
    });

    it('clamps zoom to maximum of 3.0', () => {
      usePdfStore.getState().setZoom(5.0);
      expect(usePdfStore.getState().zoom).toBe(3.0);
    });

    it('allows zoom at exact minimum boundary (0.5)', () => {
      usePdfStore.getState().setZoom(0.5);
      expect(usePdfStore.getState().zoom).toBe(0.5);
    });

    it('allows zoom at exact maximum boundary (3.0)', () => {
      usePdfStore.getState().setZoom(3.0);
      expect(usePdfStore.getState().zoom).toBe(3.0);
    });

    it('preserves zoom precision for normal values', () => {
      usePdfStore.getState().setZoom(1.75);
      expect(usePdfStore.getState().zoom).toBe(1.75);
    });

    it('clamps zoom to 0.5 for zero', () => {
      usePdfStore.getState().setZoom(0);
      expect(usePdfStore.getState().zoom).toBe(0.5);
    });
  });

  describe('setCurrentPage', () => {
    it('sets the current page', () => {
      usePdfStore.getState().setCurrentPage(5);
      expect(usePdfStore.getState().currentPage).toBe(5);
    });

    it('allows setting page to 1', () => {
      usePdfStore.getState().setCurrentPage(1);
      expect(usePdfStore.getState().currentPage).toBe(1);
    });
  });

  describe('setLibrary', () => {
    it('sets the PDF library', () => {
      const library = [sampleMeta];
      usePdfStore.getState().setLibrary(library);
      expect(usePdfStore.getState().pdfLibrary).toEqual(library);
    });

    it('can set an empty library', () => {
      usePdfStore.getState().setLibrary([sampleMeta]);
      usePdfStore.getState().setLibrary([]);
      expect(usePdfStore.getState().pdfLibrary).toEqual([]);
    });
  });

  describe('clearPdf', () => {
    it('resets pdfId and pdfMeta to null', () => {
      usePdfStore.getState().setPdf('pdf-1', sampleMeta);
      usePdfStore.getState().clearPdf();
      const state = usePdfStore.getState();
      expect(state.pdfId).toBeNull();
      expect(state.pdfMeta).toBeNull();
    });

    it('resets currentPage to 1', () => {
      usePdfStore.getState().setCurrentPage(10);
      usePdfStore.getState().clearPdf();
      expect(usePdfStore.getState().currentPage).toBe(1);
    });

    it('resets zoom to 1.0', () => {
      usePdfStore.getState().setZoom(2.5);
      usePdfStore.getState().clearPdf();
      expect(usePdfStore.getState().zoom).toBe(1.0);
    });

    it('does not affect pdfLibrary', () => {
      usePdfStore.getState().setLibrary([sampleMeta]);
      usePdfStore.getState().clearPdf();
      expect(usePdfStore.getState().pdfLibrary).toEqual([sampleMeta]);
    });
  });
});
