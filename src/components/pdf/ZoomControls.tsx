'use client';

import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { usePdfStore } from '@/store/pdfStore';
import { Button } from '@/components/ui/Button';

const ZOOM_STEP = 0.25;
const FIT_WIDTH_ZOOM = 1.0;

export function ZoomControls() {
  const zoom = usePdfStore((s) => s.zoom);
  const setZoom = usePdfStore((s) => s.setZoom);

  const zoomIn = () => setZoom(zoom + ZOOM_STEP);
  const zoomOut = () => setZoom(zoom - ZOOM_STEP);
  const fitWidth = () => setZoom(FIT_WIDTH_ZOOM);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={zoomOut}
        disabled={zoom <= 0.5}
        className="p-1.5"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>

      <span className="text-xs text-[var(--text-secondary)] min-w-[3rem] text-center tabular-nums">
        {zoomPercent}%
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={zoomIn}
        disabled={zoom >= 3.0}
        className="p-1.5"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={fitWidth}
        className="p-1.5"
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
