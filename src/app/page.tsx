'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, BookOpen, Plus } from 'lucide-react';
import type { PdfMeta } from '@/types/pdf';
import { usePdfStore } from '@/store/pdfStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AppShell } from '@/components/layout/AppShell';

export default function HomePage() {
  const router = useRouter();
  const [pdfs, setPdfs] = useState<PdfMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setLibrary = usePdfStore((s) => s.setLibrary);

  const loadPdfs = useCallback(async () => {
    try {
      const res = await fetch('/api/pdf/upload');
      const data = await res.json();
      const list = data.pdfs ?? [];
      setPdfs(list);
      setLibrary(list);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [setLibrary]);

  useEffect(() => {
    loadPdfs();
  }, [loadPdfs]);

  const handleUpload = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/pdf/upload', { method: 'POST', body: formData });
      if (res.ok) {
        await loadPdfs();
      }
    } finally {
      setIsUploading(false);
    }
  }, [loadPdfs]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const openPdf = (pdfId: string) => {
    router.push(`/reader?pdf=${pdfId}`);
  };

  return (
    <AppShell>
      <div className="flex-1 flex flex-col items-center overflow-y-auto">
        {/* Header */}
        <div className="w-full max-w-4xl px-6 pt-16 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center glow-accent">
              <BookOpen size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Readable</h1>
          </div>
          <p className="text-[var(--text-secondary)] text-sm ml-[52px]">
            AI-powered co-reading assistant for your PDFs
          </p>
        </div>

        {/* Upload area */}
        <div className="w-full max-w-4xl px-6 mb-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
              ${isDragging
                ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                : 'border-[var(--glass-border)] hover:border-[var(--text-muted)] glass'}
            `}
          >
            {isUploading ? (
              <>
                <Spinner size="md" />
                <p className="text-sm text-[var(--text-secondary)]">Uploading...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full glass flex items-center justify-center">
                  <Upload size={22} className="text-[var(--accent)]" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-primary)] font-medium">
                    Drop a PDF here or click to upload
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Textbooks, research papers, lecture notes
                  </p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* PDF Library Grid */}
        <div className="w-full max-w-4xl px-6 pb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Library</h2>
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Plus size={16} /> Add PDF
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={40} className="text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)]">No PDFs yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Upload your first PDF to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdfs.map((pdf) => (
                <GlassCard
                  key={pdf.id}
                  variant="default"
                  hover
                  onClick={() => openPdf(pdf.id)}
                  className="p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg glass flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-[var(--accent)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {pdf.title || pdf.fileName}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {pdf.pageCount} pages
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(pdf.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
