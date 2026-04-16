'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useAnnotationStore } from '@/store/annotationStore';
import { useAnnotation } from '@/hooks/useAnnotation';
import type { Point, Stroke } from '@/types/annotation';

interface AnnotationCanvasProps {
  pageNumber: number;
  zoom: number;
  baseDimensions: { width: number; height: number };
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  tool: 'pen' | 'highlighter',
  color: string,
  zoom: number
) {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'pen') {
    ctx.lineWidth = 2 * zoom;
    ctx.globalAlpha = 1.0;
  } else {
    ctx.lineWidth = 16 * zoom;
    ctx.globalAlpha = 0.3;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x * zoom, points[0].y * zoom);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * zoom, points[i].y * zoom);
  }
  ctx.stroke();
  ctx.restore();
}

export function AnnotationCanvas({ pageNumber, zoom, baseDimensions }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const strokesByPage = useAnnotationStore((s) => s.strokesByPage);
  const strokes = useMemo(() => strokesByPage.get(pageNumber) ?? [], [strokesByPage, pageNumber]);
  const currentStrokeData = useAnnotationStore((s) => s.currentStroke);
  const annotationMode = useAnnotationStore((s) => s.annotationMode);
  const activeColor = useAnnotationStore((s) => s.activeColor);

  // Attach drawing listeners via the hook
  useAnnotation(pageNumber, canvasRef, zoom);

  const canvasWidth = Math.floor(baseDimensions.width * zoom);
  const canvasHeight = Math.floor(baseDimensions.height * zoom);

  // Redraw whenever strokes, currentStroke, or zoom change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all saved strokes for this page
    for (const stroke of strokes) {
      drawStroke(ctx, stroke.points, stroke.tool, stroke.color, zoom);
    }

    // Draw live preview of current stroke if it belongs to this page
    if (
      currentStrokeData &&
      currentStrokeData.pageNumber === pageNumber &&
      annotationMode !== 'off'
    ) {
      drawStroke(ctx, currentStrokeData.points, annotationMode, activeColor, zoom);
    }
  }, [strokes, currentStrokeData, annotationMode, activeColor, zoom, pageNumber]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      data-annotation-canvas={pageNumber}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        zIndex: 10,
        pointerEvents: annotationMode !== 'off' ? 'auto' : 'none',
        cursor: annotationMode !== 'off' ? 'crosshair' : undefined,
      }}
    />
  );
}
