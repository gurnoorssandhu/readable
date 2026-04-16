'use client';

import { useCallback, useRef, useEffect, type RefObject } from 'react';
import { useAnnotationStore } from '@/store/annotationStore';
import { generateId } from '@/lib/utils';
import type { Point } from '@/types/annotation';

export function useAnnotation(
  pageNumber: number,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  zoom: number
) {
  const trackingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const annotationMode = useAnnotationStore((s) => s.annotationMode);
  const activeColor = useAnnotationStore((s) => s.activeColor);
  const addStroke = useAnnotationStore((s) => s.addStroke);
  const setCurrentStroke = useAnnotationStore((s) => s.setCurrentStroke);

  const getPoint = useCallback(
    (e: PointerEvent, canvas: HTMLCanvasElement): Point => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
    },
    [zoom]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || annotationMode === 'off') return;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // only primary button
      trackingRef.current = true;
      pointerIdRef.current = e.pointerId;

      const firstPoint = getPoint(e, canvas);
      setCurrentStroke({ pageNumber, points: [firstPoint] });
      canvas.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!trackingRef.current) return;

      const newPoint = getPoint(e, canvas);
      const current = useAnnotationStore.getState().currentStroke;
      if (current) {
        setCurrentStroke({
          pageNumber: current.pageNumber,
          points: [...current.points, newPoint],
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!trackingRef.current) return;
      trackingRef.current = false;

      const current = useAnnotationStore.getState().currentStroke;
      const mode = useAnnotationStore.getState().annotationMode;
      const color = useAnnotationStore.getState().activeColor;

      if (current && current.points.length > 0 && mode !== 'off') {
        addStroke({
          id: generateId(),
          tool: mode,
          color,
          points: current.points,
          pageNumber,
          timestamp: Date.now(),
        });
      }

      setCurrentStroke(null);

      if (pointerIdRef.current !== null) {
        try {
          canvas.releasePointerCapture(pointerIdRef.current);
        } catch {
          // pointer capture may already be released
        }
        pointerIdRef.current = null;
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      trackingRef.current = false;
      pointerIdRef.current = null;
    };
  }, [canvasRef, annotationMode, pageNumber, zoom, getPoint, activeColor, addStroke, setCurrentStroke]);
}
