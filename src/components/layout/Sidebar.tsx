'use client';

import React, { useEffect, useState } from 'react';
import { X, FileText, Clock } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import type { PdfMeta } from '@/types/pdf';
import { GlassCard } from '@/components/ui/GlassCard';

interface SidebarProps {
  onSelectPdf: (pdfId: string) => void;
  currentPdfId?: string;
}

export function Sidebar({ onSelectPdf, currentPdfId }: SidebarProps) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const [pdfs, setPdfs] = useState<PdfMeta[]>([]);

  useEffect(() => {
    if (sidebarOpen) {
      fetch('/api/pdf/upload')
        .then((r) => r.json())
        .then((data) => setPdfs(data.pdfs ?? []))
        .catch(() => {});
    }
  }, [sidebarOpen]);

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar panel */}
      <div className="fixed left-0 top-0 bottom-0 w-72 z-50 glass-strong border-r border-[var(--glass-border)] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Library</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pdfs.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">
              No PDFs uploaded yet
            </p>
          )}
          {pdfs.map((pdf) => (
            <GlassCard
              key={pdf.id}
              variant="subtle"
              hover
              onClick={() => {
                onSelectPdf(pdf.id);
                setSidebarOpen(false);
              }}
              className={`p-3 ${pdf.id === currentPdfId ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : ''}`}
            >
              <div className="flex items-start gap-2">
                <FileText size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                    {pdf.title || pdf.fileName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--text-muted)]">
                      {pdf.pageCount} pages
                    </span>
                    <Clock size={10} className="text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(pdf.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </>
  );
}
