'use client';

import React from 'react';
import { Pen, Highlighter, Undo2 } from 'lucide-react';
import { useAnnotationStore } from '@/store/annotationStore';
import { useUiStore } from '@/store/uiStore';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#ffffff'];

export function AnnotationToolbar() {
  const annotationMode = useAnnotationStore((s) => s.annotationMode);
  const activeColor = useAnnotationStore((s) => s.activeColor);
  const setAnnotationMode = useAnnotationStore((s) => s.setAnnotationMode);
  const setActiveColor = useAnnotationStore((s) => s.setActiveColor);
  const undo = useAnnotationStore((s) => s.undo);
  const setSnapshotMode = useUiStore((s) => s.setSnapshotMode);

  const btnBase = 'p-2 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors';
  const activeClass = 'text-[var(--accent)]';
  const inactiveClass = 'text-[var(--text-muted)] hover:text-[var(--text-primary)]';

  const handlePenClick = () => {
    setAnnotationMode(annotationMode === 'pen' ? 'off' : 'pen');
    setSnapshotMode(false);
  };

  const handleHighlighterClick = () => {
    setAnnotationMode(annotationMode === 'highlighter' ? 'off' : 'highlighter');
    setSnapshotMode(false);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Pen */}
      <button
        onClick={handlePenClick}
        className={btnBase}
        title="Pen"
      >
        <Pen size={16} className={annotationMode === 'pen' ? activeClass : inactiveClass} />
      </button>

      {/* Highlighter */}
      <button
        onClick={handleHighlighterClick}
        className={btnBase}
        title="Highlighter"
      >
        <Highlighter
          size={16}
          className={annotationMode === 'highlighter' ? activeClass : inactiveClass}
        />
      </button>

      {/* Color picker - only when annotation mode is active */}
      {annotationMode !== 'off' && (
        <div className="flex items-center gap-1 ml-1">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              className={`w-3 h-3 rounded-full cursor-pointer transition-all ${
                activeColor === color
                  ? 'ring-2 ring-offset-1 ring-offset-transparent ring-[var(--accent)]'
                  : ''
              } ${color === '#ffffff' ? 'border border-[var(--glass-border)]' : ''}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* Undo */}
      <button
        onClick={undo}
        className={btnBase}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={16} className={inactiveClass} />
      </button>
    </div>
  );
}
