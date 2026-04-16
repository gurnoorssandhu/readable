'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { usePdfStore } from '@/store/pdfStore';

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200];
const ZOOM_STEP = 0.1;

export function ZoomDropdown() {
  const zoom = usePdfStore((s) => s.zoom);
  const setZoom = usePdfStore((s) => s.setZoom);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPercent = Math.round(zoom * 100);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const btnClass = 'p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors';

  return (
    <div ref={containerRef} className="relative flex items-center gap-0.5">
      <button onClick={() => setZoom(zoom - ZOOM_STEP)} className={btnClass} title="Zoom out">
        <Minus size={14} />
      </button>

      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1.5 transition-colors min-w-[40px] text-center"
      >
        {currentPercent}%
      </button>

      <button onClick={() => setZoom(zoom + ZOOM_STEP)} className={btnClass} title="Zoom in">
        <Plus size={14} />
      </button>

      {open && (
        <div
          className="absolute glass-strong shadow-xl rounded-lg py-1 min-w-[80px]"
          style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4 }}
        >
          {ZOOM_PRESETS.map((preset) => (
            <div
              key={preset}
              onClick={() => {
                setZoom(preset / 100);
                setOpen(false);
              }}
              className={`px-3 py-1.5 text-xs hover:bg-[var(--glass-bg-hover)] cursor-pointer ${
                preset === currentPercent ? 'text-[var(--accent)]' : ''
              }`}
            >
              {preset}%
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
