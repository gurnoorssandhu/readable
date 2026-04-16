'use client';

import { X } from 'lucide-react';
import { usePdfStore } from '@/store/pdfStore';
import PageThumbnail from './PageThumbnail';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface TOCSidebarProps {
  pdfDocument: PDFDocumentProxy | null;
}

export default function TOCSidebar({ pdfDocument }: TOCSidebarProps) {
  const tocOpen = usePdfStore((s) => s.tocOpen);
  const tocTab = usePdfStore((s) => s.tocTab);
  const outline = usePdfStore((s) => s.outline);
  const currentPage = usePdfStore((s) => s.currentPage);
  const toggleToc = usePdfStore((s) => s.toggleToc);
  const setTocTab = usePdfStore((s) => s.setTocTab);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const setScrollToPage = usePdfStore((s) => s.setScrollToPage);
  const pageCount = pdfDocument?.numPages ?? 0;

  const navigateToPage = (page: number) => {
    setCurrentPage(page);
    setScrollToPage(page);
  };

  if (!tocOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-30" onClick={toggleToc} />

      {/* Sidebar panel */}
      <div
        className="fixed left-0 top-0 bottom-0 w-60 z-35 glass-strong border-r border-[var(--glass-border)] shadow-2xl flex flex-col"
        style={{ animation: 'slideInLeft 0.25s ease-out', zIndex: 35 }}
      >
        {/* Header with tabs */}
        <div className="border-b border-[var(--glass-border)] px-3 py-2 flex items-center gap-2">
          <button
            onClick={() => setTocTab('thumbnails')}
            className={`text-xs font-medium pb-0.5 transition-colors ${
              tocTab === 'thumbnails'
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Thumbnails
          </button>
          <button
            onClick={() => setTocTab('outline')}
            className={`text-xs font-medium pb-0.5 transition-colors ${
              tocTab === 'outline'
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Outline
          </button>
          <button
            onClick={toggleToc}
            className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-2">
          {tocTab === 'thumbnails' && pdfDocument && (
            <div className="flex flex-col items-center gap-1">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
                <PageThumbnail
                  key={num}
                  pageNumber={num}
                  pdfDocument={pdfDocument}
                  isActive={num === currentPage}
                  onClick={() => navigateToPage(num)}
                />
              ))}
            </div>
          )}

          {tocTab === 'outline' && (
            <>
              {outline.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-xs text-[var(--text-muted)]">No outline available</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {outline.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigateToPage(item.pageNumber)}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] w-full text-left py-1.5 rounded truncate"
                      style={{ paddingLeft: `${item.level * 16 + 12}px` }}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
