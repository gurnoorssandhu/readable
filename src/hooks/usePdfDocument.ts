'use client';

import { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { usePdfStore } from '@/store/pdfStore';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface OutlineItem {
  title: string;
  pageNumber: number;
  level: number;
}

async function flattenOutline(
  doc: PDFDocumentProxy,
  items: any[],
  level: number
): Promise<OutlineItem[]> {
  const result: OutlineItem[] = [];

  for (const item of items) {
    let pageNumber = 1;
    try {
      if (item.dest) {
        const dest = typeof item.dest === 'string'
          ? await doc.getDestination(item.dest)
          : item.dest;
        if (dest && dest[0]) {
          const pageIndex = await doc.getPageIndex(dest[0]);
          pageNumber = pageIndex + 1;
        }
      }
    } catch {
      // fallback to page 1
    }

    result.push({ title: item.title, pageNumber, level });

    if (item.items && item.items.length > 0) {
      const children = await flattenOutline(doc, item.items, level + 1);
      result.push(...children);
    }
  }

  return result;
}

interface UsePdfDocumentResult {
  pdfDocument: PDFDocumentProxy | null;
  pageCount: number;
  isLoading: boolean;
  error: string | null;
}

const documentCache = new Map<string, PDFDocumentProxy>();

export function usePdfDocument(url: string | null): UsePdfDocumentResult {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!url) {
      setPdfDocument(null);
      setPageCount(0);
      setError(null);
      return;
    }

    // Check cache first
    const cached = documentCache.get(url);
    if (cached) {
      setPdfDocument(cached);
      setPageCount(cached.numPages);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Prevent duplicate loads of the same URL
    if (loadingUrlRef.current === url) {
      return;
    }

    let cancelled = false;
    loadingUrlRef.current = url;
    setIsLoading(true);
    setError(null);

    const loadDocument = async () => {
      try {
        const loadingTask = pdfjs.getDocument(url);
        const doc = await loadingTask.promise;

        if (cancelled) {
          doc.destroy();
          return;
        }

        documentCache.set(url, doc);
        setPdfDocument(doc);
        setPageCount(doc.numPages);
        setIsLoading(false);

        // Extract outline
        try {
          const rawOutline = await doc.getOutline();
          if (rawOutline) {
            const flatOutline = await flattenOutline(doc, rawOutline, 0);
            const { setOutline } = usePdfStore.getState();
            setOutline(flatOutline);
          }
        } catch (err) {
          console.warn('Failed to extract PDF outline:', err);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(message);
        setIsLoading(false);
      } finally {
        if (!cancelled) {
          loadingUrlRef.current = null;
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      loadingUrlRef.current = null;
    };
  }, [url]);

  return { pdfDocument, pageCount, isLoading, error };
}
