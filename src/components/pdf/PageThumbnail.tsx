'use client';

import { useRef, useEffect, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PageThumbnailProps {
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  isActive: boolean;
  onClick: () => void;
}

export default function PageThumbnail({ pageNumber, pdfDocument, isActive, onClick }: PageThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderedRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || renderedRef.current || !canvasRef.current) return;
    renderedRef.current = true;

    const renderThumbnail = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.2 });
        const offscreen = document.createElement('canvas');
        offscreen.width = viewport.width;
        offscreen.height = viewport.height;
        const ctx = offscreen.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas: offscreen } as any).promise;

        const visibleCanvas = canvasRef.current;
        if (visibleCanvas) {
          visibleCanvas.width = viewport.width;
          visibleCanvas.height = viewport.height;
          const visibleCtx = visibleCanvas.getContext('2d')!;
          visibleCtx.drawImage(offscreen, 0, 0);
        }
      } catch (err) {
        console.warn(`Failed to render thumbnail for page ${pageNumber}:`, err);
      }
    };

    renderThumbnail();
  }, [isVisible, pdfDocument, pageNumber]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`cursor-pointer p-2 rounded-lg transition-all ${
        isActive
          ? 'border-2 border-[var(--accent)] bg-[var(--accent-glow)]'
          : 'border-2 border-transparent hover:bg-[var(--glass-bg-hover)]'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="rounded shadow-sm w-full"
        style={{ maxWidth: '120px' }}
      />
      <p className="text-[10px] text-[var(--text-muted)] text-center mt-1">
        {pageNumber}
      </p>
    </div>
  );
}
