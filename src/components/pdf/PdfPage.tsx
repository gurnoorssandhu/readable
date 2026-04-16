'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PdfPageProps {
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  zoom: number;
  onCanvasReady?: (pageNumber: number, canvas: HTMLCanvasElement) => void;
}

const RENDER_SCALE = 2;

export function PdfPage({ pageNumber, pdfDocument, zoom, onCanvasReady }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const renderedRef = useRef(false);
  const [baseDimensions, setBaseDimensions] = useState<{ width: number; height: number } | null>(null);

  const renderPage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRenderingRef.current || renderedRef.current) return;

    isRenderingRef.current = true;

    try {
      if (renderTaskRef.current) {
        try { await renderTaskRef.current.cancel?.(); } catch {}
        renderTaskRef.current = null;
      }

      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const baseViewport = page.getViewport({ scale: 1 });
      setBaseDimensions({ width: baseViewport.width, height: baseViewport.height });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const context = canvas.getContext('2d');
      if (!context) return;

      const renderTask = page.render({ canvas, canvasContext: context, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderedRef.current = true;

      if (onCanvasReady && canvasRef.current) {
        onCanvasReady(pageNumber, canvasRef.current);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Rendering cancelled')) return;
      console.error(`Error rendering page ${pageNumber}:`, err);
    } finally {
      isRenderingRef.current = false;
      renderTaskRef.current = null;
    }
  }, [pdfDocument, pageNumber, onCanvasReady]);

  useEffect(() => {
    renderPage();
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel?.(); } catch {}
      }
    };
  }, [renderPage]);

  const cssWidth = baseDimensions ? Math.floor(baseDimensions.width * zoom) : undefined;
  const cssHeight = baseDimensions ? Math.floor(baseDimensions.height * zoom) : undefined;

  return (
    <div
      className="pdf-page flex justify-center py-2"
      data-page-number={pageNumber}
    >
      <canvas
        ref={canvasRef}
        className="shadow-lg rounded"
        style={{
          display: 'block',
          width: cssWidth ? `${cssWidth}px` : undefined,
          height: cssHeight ? `${cssHeight}px` : undefined,
        }}
      />
    </div>
  );
}
