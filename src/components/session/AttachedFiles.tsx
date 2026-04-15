'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Paperclip, X, Upload } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import type { AttachedFile } from '@/types/session';
import { fileToBase64 } from '@/lib/utils';

export function AttachedFiles() {
  const attachedFiles = useSessionStore((s) => s.attachedFiles);
  const addAttachedFile = useSessionStore((s) => s.addAttachedFile);
  const removeAttachedFile = useSessionStore((s) => s.removeAttachedFile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      // Prevent duplicates by name
      if (attachedFiles.some((f) => f.name === file.name)) return;

      const contentBase64 = await fileToBase64(file);
      const attached: AttachedFile = {
        name: file.name,
        contentBase64,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      };
      addAttachedFile(attached);
    },
    [attachedFiles, addAttachedFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        await processFile(file);
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        await processFile(file);
      }
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer
          transition-colors duration-200 text-sm
          ${
            isDragging
              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
              : 'border-[var(--glass-border)] hover:border-[var(--text-muted)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }
        `}
      >
        <Upload size={16} />
        <span>Drop files or click to attach</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Attached file list */}
      {attachedFiles.length > 0 && (
        <ul className="space-y-1">
          {attachedFiles.map((file) => (
            <li
              key={file.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-subtle text-sm"
            >
              <Paperclip size={14} className="text-[var(--text-muted)] shrink-0" />
              <span className="truncate flex-1 text-[var(--text-secondary)]">
                {file.name}
              </span>
              <span className="text-xs text-[var(--text-muted)] shrink-0">
                {formatSize(file.size)}
              </span>
              <button
                onClick={() => removeAttachedFile(file.name)}
                className="p-0.5 rounded hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors shrink-0"
                aria-label={`Remove ${file.name}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
