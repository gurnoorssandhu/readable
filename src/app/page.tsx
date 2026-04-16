'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Plus, Trash2 } from 'lucide-react';
import type { PdfMeta } from '@/types/pdf';
import { usePdfStore } from '@/store/pdfStore';
import { Spinner } from '@/components/ui/Spinner';

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

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch('/api/pdf/upload', { method: 'DELETE', body: JSON.stringify({ id }) });
      await loadPdfs();
    } catch {
      // ignore
    }
  }, [loadPdfs]);

  return (
    <div className="h-screen w-screen overflow-y-auto bg-gradient-dark">
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Readable</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">AI-powered co-reading assistant</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors glow-accent"
          >
            <Plus size={14} />
            Add PDF
          </button>
        </div>

        {/* Upload drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed cursor-pointer transition-all duration-200
            ${isDragging
              ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
              : 'border-[var(--glass-border)] hover:border-[var(--text-muted)] toolbar-glass'}
          `}
        >
          {isUploading ? (
            <>
              <Spinner size="md" />
              <p className="text-xs text-[var(--text-secondary)]">Uploading...</p>
            </>
          ) : (
            <>
              <Upload size={20} className="text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">
                Drop a PDF here or click to upload
              </p>
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

        {/* PDF Library List */}
        <div className="mt-10">
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Your Library</h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No PDFs yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {pdfs.map((pdf, idx) => (
                <div
                  key={pdf.id}
                  onClick={() => openPdf(pdf.id)}
                  role="button"
                  className={`group flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors text-left cursor-pointer ${
                    idx < pdfs.length - 1 ? 'border-b border-[var(--glass-border)]' : ''
                  }`}
                >
                  <FileText size={16} className="text-[var(--text-muted)] shrink-0" />
                  <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
                    {pdf.title || pdf.fileName}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
                    {pdf.pageCount}p
                  </span>
                  <span className="text-xs text-[var(--text-muted)] tabular-nums shrink-0">
                    {new Date(pdf.uploadedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, pdf.id)}
                    className="p-1 rounded hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    title="Delete PDF"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
