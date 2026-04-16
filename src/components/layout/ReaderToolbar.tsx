'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PanelLeft, Camera, MessageSquare, Home } from 'lucide-react';
import { usePdfStore } from '@/store/pdfStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';
import { useAnnotationStore } from '@/store/annotationStore';
import { ZoomDropdown } from '@/components/pdf/ZoomDropdown';
import { CoReadingToggle } from '@/components/session/CoReadingToggle';
import { AnnotationToolbar } from '@/components/pdf/AnnotationToolbar';

interface ReaderToolbarProps {
  pdfId: string;
  onEndRequest?: () => void;
  onBack?: () => void;
}

function Separator() {
  return <div className="w-px h-5 bg-[var(--glass-border)] mx-1" />;
}

export function ReaderToolbar({ pdfId, onEndRequest, onBack }: ReaderToolbarProps) {
  const currentPage = usePdfStore((s) => s.currentPage);
  const pageCount = usePdfStore((s) => s.pdfMeta?.pageCount ?? 0);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const setScrollToPage = usePdfStore((s) => s.setScrollToPage);
  const toggleToc = usePdfStore((s) => s.toggleToc);
  const setSnapshotMode = useUiStore((s) => s.setSnapshotMode);
  const toggleChatPanel = useUiStore((s) => s.toggleChatPanel);
  const isCoReading = useSessionStore((s) => s.isCoReading);
  const setAnnotationMode = useAnnotationStore((s) => s.setAnnotationMode);

  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [editingPage, setEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetTimer = useCallback(() => {
    setToolbarVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToolbarVisible(false), 3000);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', resetTimer);
    resetTimer();
    return () => {
      document.removeEventListener('mousemove', resetTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);

  const commitPageInput = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= pageCount) {
      setCurrentPage(parsed);
      setScrollToPage(parsed);
    }
    setEditingPage(false);
  };

  const startEditing = () => {
    setPageInput(String(currentPage));
    setEditingPage(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const iconBtnClass = 'p-2 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors';
  const iconClass = 'text-[var(--text-muted)] hover:text-[var(--text-primary)]';

  return (
    <div
      className={`toolbar-autohide ${toolbarVisible ? '' : 'hidden'}`}
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
    >
      <div
        className="toolbar-glass flex items-center gap-1"
        style={{ height: 40, paddingLeft: 12, paddingRight: 12 }}
      >
        {/* Home */}
        <button onClick={onBack} className={iconBtnClass} title="Back to Library">
          <Home size={16} className={iconClass} />
        </button>

        <Separator />

        {/* TOC toggle */}
        <button onClick={toggleToc} className={iconBtnClass} title="Table of Contents">
          <PanelLeft size={16} className={iconClass} />
        </button>

        <Separator />

        {/* Page indicator */}
        {editingPage ? (
          <input
            ref={inputRef}
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPageInput();
              if (e.key === 'Escape') setEditingPage(false);
            }}
            className="w-12 text-center text-xs bg-transparent border border-[var(--glass-border)] rounded px-1 py-0.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <button
            onClick={startEditing}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 transition-colors"
          >
            {currentPage} / {pageCount}
          </button>
        )}

        <Separator />

        {/* Zoom */}
        <ZoomDropdown />

        {/* Snapshot */}
        <button
          onClick={() => { setSnapshotMode(true); setAnnotationMode('off'); }}
          className={iconBtnClass}
          title="Take Snapshot"
        >
          <Camera size={16} className={iconClass} />
        </button>

        <Separator />

        {/* Annotation tools */}
        <AnnotationToolbar />

        <Separator />

        {/* Co-Reading toggle (compact) */}
        <CoReadingToggle pdfId={pdfId} onEndRequest={onEndRequest} compact />

        {/* Chat toggle (only when co-reading) */}
        {isCoReading && (
          <button onClick={toggleChatPanel} className={iconBtnClass} title="Toggle Chat">
            <MessageSquare size={16} className={iconClass} />
          </button>
        )}
      </div>
    </div>
  );
}
