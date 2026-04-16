'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { ChatMessage as ChatMessageType } from '@/types/session';
import { ToolCallIndicator } from './ToolCallIndicator';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
          isUser
            ? 'bg-[var(--accent)] text-white rounded-br-md'
            : 'glass rounded-bl-md text-[var(--text-primary)]'
        }`}
      >
        {/* Snapshot preview if attached */}
        {message.snapshot && (
          <div className="mb-2">
            <img
              src={`data:image/png;base64,${message.snapshot.imageBase64}`}
              alt={`Snapshot from page ${message.snapshot.pageNumber}`}
              className="max-w-full h-auto rounded-lg border border-white/20"
            />
            <p className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
              Page {message.snapshot.pageNumber}
            </p>
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="chat-markdown text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool call indicators */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallIndicator toolCalls={message.toolCalls} />
        )}
      </div>
    </div>
  );
}
