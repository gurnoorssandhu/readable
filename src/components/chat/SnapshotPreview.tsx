'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';

export function SnapshotPreview() {
  const snapshot = useSessionStore((s) => s.pendingSnapshot);

  if (!snapshot) return null;

  return (
    <div className="flex items-start gap-2 p-2 glass-subtle rounded-lg">
      <img
        src={`data:image/png;base64,${snapshot.imageBase64}`}
        alt={`Snapshot from page ${snapshot.pageNumber}`}
        className="w-20 h-auto rounded border border-[var(--glass-border)]"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-muted)]">
          Page {snapshot.pageNumber} snapshot
        </p>
      </div>
      <button
        onClick={() => useSessionStore.getState().setSnapshot(null)}
        className="p-1 rounded hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}
