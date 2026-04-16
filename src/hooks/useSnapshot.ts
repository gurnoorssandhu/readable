'use client';

import { useState, useCallback, useRef, type RefObject } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';
import { usePdfStore } from '@/store/pdfStore';
import type { Snapshot } from '@/types/pdf';

interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseSnapshotResult {
  isSelecting: boolean;
  selectionRect: SelectionRect | null;
  startSnapshot: () => void;
  cancelSnapshot: () => void;
}

export function useSnapshot(
  containerRef: RefObject<HTMLDivElement | null>,
  canvasMapRef: RefObject<Map<number, HTMLCanvasElement>>,
): UseSnapshotResult {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const setSnapshot = useSessionStore((s) => s.setSnapshot);
  const setSnapshotMode = useUiStore((s) => s.setSnapshotMode);
  const zoom = usePdfStore((s) => s.zoom);

  const getContainerRelativePos = useCallback(
    (e: MouseEvent): { x: number; y: number } => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      return {
        x: e.clientX - rect.left + container.scrollLeft,
        y: e.clientY - rect.top + container.scrollTop,
      };
    },
    [containerRef],
  );

  const findPageAndCanvas = useCallback(
    (
      rect: SelectionRect,
    ): { pageNumber: number; canvas: HTMLCanvasElement } | null => {
      const container = containerRef.current;
      const canvasMap = canvasMapRef.current;
      if (!container || !canvasMap) return null;

      // Find which page the selection center falls on
      const centerY = rect.y + rect.h / 2;

      const pageElements = container.querySelectorAll<HTMLElement>('[data-page-number]');
      for (const pageEl of pageElements) {
        const pageNum = parseInt(pageEl.dataset.pageNumber || '0', 10);
        if (pageNum <= 0) continue;

        const pageTop = pageEl.offsetTop;
        const pageBottom = pageTop + pageEl.offsetHeight;

        if (centerY >= pageTop && centerY <= pageBottom) {
          const canvas = canvasMap.get(pageNum);
          if (canvas) {
            return { pageNumber: pageNum, canvas };
          }
        }
      }

      return null;
    },
    [containerRef, canvasMapRef],
  );

  const extractRegion = useCallback(
    (canvas: HTMLCanvasElement, pageElement: HTMLElement, rect: SelectionRect): string | null => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Calculate the position relative to the page element
      const pageTop = pageElement.offsetTop;
      const pageLeft = pageElement.offsetLeft;

      // Selection rect is in container-scroll coordinates; convert to page-local coords
      const localX = rect.x - pageLeft;
      const localY = rect.y - pageTop;

      // The canvas might be rendered at a different scale than CSS size
      const canvasScaleX = canvas.width / (canvas.offsetWidth || canvas.width);
      const canvasScaleY = canvas.height / (canvas.offsetHeight || canvas.height);

      // Convert to canvas pixel coordinates
      const sx = Math.max(0, Math.round(localX * canvasScaleX));
      const sy = Math.max(0, Math.round(localY * canvasScaleY));
      const sw = Math.min(canvas.width - sx, Math.round(rect.w * canvasScaleX));
      const sh = Math.min(canvas.height - sy, Math.round(rect.h * canvasScaleY));

      if (sw <= 0 || sh <= 0) return null;

      const imageData = ctx.getImageData(sx, sy, sw, sh);

      // Draw onto a temporary canvas to produce a data URL
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sw;
      tempCanvas.height = sh;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;

      tempCtx.putImageData(imageData, 0, 0);

      // Composite annotation canvas if it exists
      const annotationCanvas = pageElement.querySelector<HTMLCanvasElement>('[data-annotation-canvas]');
      if (annotationCanvas) {
        // Draw the corresponding region from the annotation canvas
        // The annotation canvas is at CSS pixel scale (baseDimensions * zoom)
        // We need to extract the same region from it
        const annoSx = Math.max(0, Math.round(localX));
        const annoSy = Math.max(0, Math.round(localY));
        const annoSw = Math.min(annotationCanvas.width - annoSx, Math.round(rect.w));
        const annoSh = Math.min(annotationCanvas.height - annoSy, Math.round(rect.h));

        if (annoSw > 0 && annoSh > 0) {
          tempCtx.drawImage(
            annotationCanvas,
            annoSx, annoSy, annoSw, annoSh,  // source rect
            0, 0, sw, sh                       // dest rect (stretch to match PDF resolution)
          );
        }
      }

      // Strip the data URL prefix — API needs raw base64
      const dataUrl = tempCanvas.toDataURL('image/png');
      return dataUrl.replace(/^data:image\/png;base64,/, '');
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      const pos = getContainerRelativePos(e);
      startPosRef.current = pos;
      setIsSelecting(true);
      setSelectionRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    },
    [getContainerRelativePos],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!startPosRef.current) return;
      e.preventDefault();
      const pos = getContainerRelativePos(e);
      const start = startPosRef.current;

      setSelectionRect({
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        w: Math.abs(pos.x - start.x),
        h: Math.abs(pos.y - start.y),
      });
    },
    [getContainerRelativePos],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!startPosRef.current) return;
      e.preventDefault();

      const pos = getContainerRelativePos(e);
      const start = startPosRef.current;

      const finalRect: SelectionRect = {
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        w: Math.abs(pos.x - start.x),
        h: Math.abs(pos.y - start.y),
      };

      startPosRef.current = null;
      setIsSelecting(false);

      // Ignore tiny selections (accidental clicks)
      if (finalRect.w < 10 || finalRect.h < 10) {
        setSelectionRect(null);
        setSnapshotMode(false);
        return;
      }

      const result = findPageAndCanvas(finalRect);
      if (!result) {
        setSelectionRect(null);
        setSnapshotMode(false);
        return;
      }

      const container = containerRef.current;
      if (!container) {
        setSelectionRect(null);
        setSnapshotMode(false);
        return;
      }

      const pageElement = container.querySelector<HTMLElement>(
        `[data-page-number="${result.pageNumber}"]`,
      );
      if (!pageElement) {
        setSelectionRect(null);
        setSnapshotMode(false);
        return;
      }

      const base64 = extractRegion(result.canvas, pageElement, finalRect);

      if (base64) {
        const snapshot: Snapshot = {
          imageBase64: base64,
          pageNumber: result.pageNumber,
          rect: {
            x: Math.round(finalRect.x / zoom),
            y: Math.round(finalRect.y / zoom),
            w: Math.round(finalRect.w / zoom),
            h: Math.round(finalRect.h / zoom),
          },
          timestamp: Date.now(),
        };
        setSnapshot(snapshot);
      }

      setSelectionRect(null);
      setSnapshotMode(false);
    },
    [
      getContainerRelativePos,
      findPageAndCanvas,
      extractRegion,
      containerRef,
      zoom,
      setSnapshot,
      setSnapshotMode,
    ],
  );

  const startSnapshot = useCallback(() => {
    setSnapshotMode(true);
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
  }, [containerRef, handleMouseDown, handleMouseMove, handleMouseUp, setSnapshotMode]);

  const cancelSnapshot = useCallback(() => {
    setIsSelecting(false);
    setSelectionRect(null);
    startPosRef.current = null;
    setSnapshotMode(false);

    const container = containerRef.current;
    if (container) {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
    }
  }, [containerRef, handleMouseDown, handleMouseMove, handleMouseUp, setSnapshotMode]);

  return { isSelecting, selectionRect, startSnapshot, cancelSnapshot };
}
