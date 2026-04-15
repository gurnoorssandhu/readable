'use client';

import React, { useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Camera, Square } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';
import { SnapshotPreview } from './SnapshotPreview';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onCancel?: () => void;
}

export function ChatInput({ onSend, isStreaming, onCancel }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSnapshot = useSessionStore((s) => s.pendingSnapshot);
  const setSnapshotMode = useUiStore((s) => s.setSnapshotMode);

  const handleSend = useCallback(() => {
    if (isStreaming) return;
    const text = textareaRef.current?.value.trim();
    if (!text) return;
    onSend(text);
    if (textareaRef.current) textareaRef.current.value = '';
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [onSend, isStreaming]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  }, []);

  return (
    <div className="border-t border-[var(--glass-border)] p-3 space-y-2">
      {/* Snapshot preview */}
      {pendingSnapshot && <SnapshotPreview />}

      <div className="flex items-end gap-2">
        {/* Snapshot button */}
        <button
          onClick={() => setSnapshotMode(true)}
          className="p-2 rounded-lg hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          title="Take snapshot"
        >
          <Camera size={18} />
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          placeholder="Ask about what you're reading..."
          rows={1}
          disabled={isStreaming}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          className="flex-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent)] transition-colors"
        />

        {/* Send / Cancel button */}
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="p-2 rounded-lg bg-[var(--danger)] text-white shrink-0 hover:bg-red-600 transition-colors"
            title="Stop generating"
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            className="p-2 rounded-lg bg-[var(--accent)] text-white shrink-0 hover:bg-[var(--accent-hover)] transition-colors glow-accent"
            title="Send message"
          >
            <Send size={18} />
          </button>
        )}
      </div>

      <p className="text-[10px] text-[var(--text-muted)] text-center">
        Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
