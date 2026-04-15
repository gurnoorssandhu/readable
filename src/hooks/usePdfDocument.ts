'use client';

import { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

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
