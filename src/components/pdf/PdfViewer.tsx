'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import { usePdfDocument } from '@/hooks/usePdfDocument';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { usePdfStore } from '@/store/pdfStore';
import { PdfPage } from './PdfPage';
import { PageTracker } from './PageTracker';
import { SnapshotOverlay } from './SnapshotOverlay';
import { ZoomControls } from './ZoomControls';
import { Spinner } from '@/components/ui/Spinner';

interface PdfViewerProps {
  pdfId: string;
}

export function PdfViewer({ pdfId }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const zoom = usePdfStore((s) => s.zoom);

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
    <div className="relative flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 glass-subtle border-b border-[var(--glass-border)]">
        <span className="text-xs text-[var(--text-muted)]">
          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
        </span>
        <ZoomControls />
      </div>

      {/* Scrollable page container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        style={{ background: 'var(--bg-secondary)' }}
      >
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

        {/* Snapshot selection overlay */}
        <SnapshotOverlay containerRef={containerRef} canvasMapRef={canvasMapRef} />

        {/* Invisible page tracker */}
        <PageTracker containerRef={containerRef} pageCount={pageCount} />
      </div>
    </div>
  );
}
