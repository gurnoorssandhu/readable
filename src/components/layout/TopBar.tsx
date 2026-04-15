'use client';

import React from 'react';
import { ArrowLeft, PanelRight, Menu } from 'lucide-react';
import { usePdfStore } from '@/store/pdfStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';
import { CoReadingToggle } from '@/components/session/CoReadingToggle';

interface TopBarProps {
  pdfId: string;
  onBack: () => void;
  onEndRequest?: () => void;
}

export function TopBar({ pdfId, onBack, onEndRequest }: TopBarProps) {
  const pdfMeta = usePdfStore((s) => s.pdfMeta);
  const currentPage = usePdfStore((s) => s.currentPage);
  const pageCount = pdfMeta?.pageCount ?? 0;
  const isCoReading = useSessionStore((s) => s.isCoReading);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleChatPanel = useUiStore((s) => s.toggleChatPanel);

  return (
    <div className="flex items-center justify-between px-4 py-2 glass border-b border-[var(--glass-border)] z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[300px]">
            {pdfMeta?.title ?? pdfMeta?.fileName ?? 'PDF Document'}
          </h1>
          {pageCount > 0 && (
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              {currentPage} / {pageCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CoReadingToggle pdfId={pdfId} onEndRequest={onEndRequest} />
        {isCoReading && (
          <button
            onClick={toggleChatPanel}
            className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Toggle chat panel"
          >
            <PanelRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
