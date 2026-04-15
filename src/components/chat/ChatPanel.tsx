'use client';

import React, { useRef, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { AttachedFiles } from '@/components/session/AttachedFiles';

export function ChatPanel() {
  const messages = useSessionStore((s) => s.messages);
  const isCoReading = useSessionStore((s) => s.isCoReading);
  const chatPanelOpen = useUiStore((s) => s.chatPanelOpen);
  const setChatPanelOpen = useUiStore((s) => s.setChatPanelOpen);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, cancelStream, isStreaming } = useChat();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isCoReading || !chatPanelOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full z-40 flex flex-col glass-strong border-l border-[var(--glass-border)] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--accent)]" />
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">Co-Reader</h2>
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[var(--success)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
          </span>
        </div>
        <button
          onClick={() => setChatPanelOpen(false)}
          className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center">
              <BookOpen size={24} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-primary)] font-medium">
                Co-Reading Active
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[280px]">
                Ask me anything about the pages you&apos;re viewing. Take a snapshot to ask about diagrams or equations.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Attached files section */}
      <div className="px-4 pb-2">
        <AttachedFiles />
      </div>

      {/* Input area */}
      <ChatInput onSend={sendMessage} isStreaming={isStreaming} onCancel={cancelStream} />
    </div>
  );
}
