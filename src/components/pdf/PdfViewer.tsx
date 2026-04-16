'use client';

import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { usePdfDocument } from '@/hooks/usePdfDocument';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { usePdfStore } from '@/store/pdfStore';
import { useAnnotationStore } from '@/store/annotationStore';
import { PdfPage } from './PdfPage';
import { PageTracker } from './PageTracker';
import { SnapshotOverlay } from './SnapshotOverlay';
import { Spinner } from '@/components/ui/Spinner';

interface PdfViewerProps {
  pdfId: string;
}

export function PdfViewer({ pdfId }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const zoom = usePdfStore((s) => s.zoom);
  const setZoom = usePdfStore((s) => s.setZoom);
  const scrollToPage = usePdfStore((s) => s.scrollToPage);
  const setScrollToPage = usePdfStore((s) => s.setScrollToPage);

  const pdfIdForAnnotations = useMemo(() => pdfId, [pdfId]);

  // Load annotations on mount / pdfId change
  useEffect(() => {
    fetch(`/api/annotations?pdfId=${pdfIdForAnnotations}`)
      .then((r) => r.json())
      .then((data) => {
        useAnnotationStore.getState().loadStrokes(data.strokes ?? []);
      })
      .catch(() => {});
  }, [pdfIdForAnnotations]);

  // Debounced save on annotation changes
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const unsub = useAnnotationStore.subscribe((state, prevState) => {
      if (state.strokesByPage !== prevState.strokesByPage) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const strokes = useAnnotationStore.getState().getAllStrokes();
          fetch('/api/annotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfId: pdfIdForAnnotations, strokes }),
          }).catch(() => {});
        }, 1000);
      }
    });
    return () => { unsub(); clearTimeout(timeout); };
  }, [pdfIdForAnnotations]);

  // Ctrl+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        const mode = useAnnotationStore.getState().annotationMode;
        if (mode !== 'off') {
          e.preventDefault();
          useAnnotationStore.getState().undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll to page when requested
  useEffect(() => {
    if (scrollToPage === null) return;
    const container = containerRef.current;
    if (!container) return;

    const pageEl = container.querySelector<HTMLElement>(`[data-page-number="${scrollToPage}"]`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setScrollToPage(null);
  }, [scrollToPage, setScrollToPage]);

  // Preserve scroll position on zoom changes
  const prevZoomRef = useRef(zoom);
  useEffect(() => {
    const container = containerRef.current;
    if (!container || prevZoomRef.current === zoom) return;

    const ratio = zoom / prevZoomRef.current;
    const viewportMidY = container.scrollTop + container.clientHeight / 2;
    const newMidY = viewportMidY * ratio;
    container.scrollTop = newMidY - container.clientHeight / 2;

    prevZoomRef.current = zoom;
  }, [zoom]);

  // Pinch-to-zoom (trackpad) and Ctrl+scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      setZoom(usePdfStore.getState().zoom + delta);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [setZoom]);

  const pdfUrl = useMemo(() => `/data/pdfs/${pdfId}.pdf`, [pdfId]);
  const { pdfDocument, pageCount, isLoading, error } = usePdfDocument(pdfUrl);

  // Track page visibility
  usePageVisibility(containerRef, pageCount);

  const handleCanvasReady = useCallback(
    (pageNumber: number, canvas: HTMLCanvasElement) => {
      canvasMapRef.current.set(pageNumber, canvas);
    },
    [],
  );

  // Generate array of page numbers
  const pages = useMemo(() => {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }, [pageCount]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="glass-subtle p-6 text-center max-w-md">
          <p className="text-[var(--danger)] font-medium mb-2">Failed to load PDF</p>
          <p className="text-[var(--text-muted)] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !pdfDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="lg" />
        <p className="text-[var(--text-secondary)] text-sm">Loading PDF...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto relative" ref={containerRef}
         style={{ background: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center py-4 min-h-full">
        {pages.map((pageNumber) => (
          <PdfPage
            key={pageNumber}
            pageNumber={pageNumber}
            pdfDocument={pdfDocument}
            zoom={zoom}
            onCanvasReady={handleCanvasReady}
          />
        ))}
      </div>
      <SnapshotOverlay containerRef={containerRef} canvasMapRef={canvasMapRef} />
      <PageTracker containerRef={containerRef} pageCount={pageCount} />
    </div>
  );
}
