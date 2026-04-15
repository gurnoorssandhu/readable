'use client';

import React, { useEffect, type RefObject } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useSnapshot } from '@/hooks/useSnapshot';

interface SnapshotOverlayProps {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasMapRef: RefObject<Map<number, HTMLCanvasElement>>;
}

export function SnapshotOverlay({ containerRef, canvasMapRef }: SnapshotOverlayProps) {
  const snapshotMode = useUiStore((s) => s.snapshotMode);
  const { isSelecting, selectionRect, startSnapshot, cancelSnapshot } = useSnapshot(
    containerRef,
    canvasMapRef,
  );

  // When snapshot mode is activated, attach the mouse listeners
  useEffect(() => {
    if (snapshotMode) {
      startSnapshot();
    }
    return () => {
      if (snapshotMode) {
        cancelSnapshot();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotMode]);

  // Handle Escape key to cancel
  useEffect(() => {
    if (!snapshotMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelSnapshot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snapshotMode, cancelSnapshot]);

  if (!snapshotMode) return null;

  return (
    <div
      className="absolute inset-0 z-50"
      style={{ cursor: 'crosshair' }}
    >
      {/* Semi-transparent overlay background */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Selection rectangle */}
      {isSelecting && selectionRect && selectionRect.w > 0 && selectionRect.h > 0 && (
        <div
          className="snapshot-selection absolute z-10"
          style={{
            left: `${selectionRect.x}px`,
            top: `${selectionRect.y}px`,
            width: `${selectionRect.w}px`,
            height: `${selectionRect.h}px`,
          }}
        />
      )}

      {/* Mode indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="glass px-4 py-2 text-sm text-[var(--text-secondary)] rounded-full">
          Click and drag to select a region. Press <kbd className="text-[var(--accent)]">Esc</kbd> to cancel.
        </div>
      </div>
    </div>
  );
}
