'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PdfPageProps {
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  zoom: number;
  onCanvasReady?: (pageNumber: number, canvas: HTMLCanvasElement) => void;
}

export function PdfPage({ pageNumber, pdfDocument, zoom, onCanvasReady }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<ReturnType<ReturnType<PDFDocumentProxy['getPage']>['then']> | null>(null);
  const isRenderingRef = useRef(false);

  const renderPage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRenderingRef.current) return;

    isRenderingRef.current = true;

    try {
      // Cancel any in-progress render
      if (renderTaskRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (renderTaskRef.current as any).cancel?.();
        } catch {
          // Ignore cancel errors
        }
        renderTaskRef.current = null;
      }

      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: zoom });

      // Set canvas dimensions to match the viewport
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.scale(dpr, dpr);

      const renderContext = {
        canvas: canvas,
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderTaskRef.current = renderTask as any;

      await renderTask.promise;

      if (onCanvasReady && canvasRef.current) {
        onCanvasReady(pageNumber, canvasRef.current);
      }
    } catch (err) {
      // Ignore cancellation errors (they happen during cleanup)
      if (err instanceof Error && err.message.includes('Rendering cancelled')) {
        return;
      }
      console.error(`Error rendering page ${pageNumber}:`, err);
    } finally {
      isRenderingRef.current = false;
      renderTaskRef.current = null;
    }
  }, [pdfDocument, pageNumber, zoom, onCanvasReady]);

  useEffect(() => {
    renderPage();

    return () => {
      if (renderTaskRef.current) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (renderTaskRef.current as any).cancel?.();
        } catch {
          // Ignore cancel errors
        }
      }
    };
  }, [renderPage]);

  return (
    <div
      className="pdf-page flex justify-center py-2"
      data-page-number={pageNumber}
    >
      <canvas
        ref={canvasRef}
        className="shadow-lg rounded"
        style={{ display: 'block' }}
      />
    </div>
  );
}
