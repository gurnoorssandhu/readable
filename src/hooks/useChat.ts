'use client';

import { useCallback, useRef, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { ChatRequest, ChatStreamEvent } from '@/types/chat';
import type { ChatMessage, ToolCall } from '@/types/session';
import { generateId } from '@/lib/utils';

export function useChat() {
  const [isStreaming, setIsStreamingLocal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    const store = useSessionStore.getState();
    const {
      sessionId,
      viewedPages,
      visiblePages,
      pendingSnapshot,
      attachedFiles,
    } = store;

    if (!sessionId) {
      console.error('No active session');
      return;
    }

    // Get pdfId — we need it from the session.
    // The store doesn't directly store pdfId, so we extract it from the URL or pass it.
    // For now, we'll get it from the page URL.
    const pdfId = extractPdfIdFromUrl();
    if (!pdfId) {
      console.error('No pdfId found');
      return;
    }

    // Add user message to store
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      snapshot: pendingSnapshot ?? undefined,
      attachedFiles: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    };
    store.addMessage(userMessage);

    // Clear the snapshot after attaching it to the message
    if (pendingSnapshot) {
      store.setSnapshot(null);
    }

    // Create empty assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    store.addMessage(assistantMessage);

    // Set streaming state
    setIsStreamingLocal(true);
    store.setIsStreaming(true);

    // Prepare the request
    const chatRequest: ChatRequest = {
      sessionId,
      message,
      snapshot: pendingSnapshot ?? undefined,
      attachedFiles: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
      viewedPages: Array.from(viewedPages),
      visiblePages: Array.from(visiblePages),
      pdfId,
    };

    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatRequest),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || `HTTP ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events from the buffer
        const lines = buffer.split('\n');
        buffer = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr) as ChatStreamEvent;
              handleStreamEvent(event);
            } catch {
              // Incomplete JSON — put back in buffer with remaining lines
              buffer = lines.slice(i).join('\n');
              break;
            }
          } else if (line === '') {
            // Empty line (SSE separator) — skip
          } else {
            // Not a data line, could be partial — keep in buffer
            buffer += line;
            if (i < lines.length - 1) {
              buffer += '\n';
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User cancelled — do nothing
        return;
      }

      console.error('Chat error:', err);
      const errorStore = useSessionStore.getState();
      errorStore.appendToLastMessage(
        `\n\n[Error: ${err instanceof Error ? err.message : 'Failed to get response'}]`
      );
    } finally {
      setIsStreamingLocal(false);
      useSessionStore.getState().setIsStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, cancelStream, isStreaming };
}

function handleStreamEvent(event: ChatStreamEvent) {
  const store = useSessionStore.getState();

  switch (event.type) {
    case 'text_delta':
      if (event.text) {
        store.appendToLastMessage(event.text);
      }
      break;

    case 'tool_use_start': {
      const currentMessages = store.messages;
      const lastMsg = currentMessages[currentMessages.length - 1];
      const existingCalls = lastMsg?.toolCalls ?? [];

      const newToolCall: ToolCall = {
        id: generateId(),
        name: event.toolName ?? 'unknown',
        input: event.toolInput ?? {},
        status: 'running',
      };

      store.updateLastMessageToolCalls([...existingCalls, newToolCall]);
      break;
    }

    case 'tool_use_result': {
      const msgs = store.messages;
      const last = msgs[msgs.length - 1];
      if (last?.toolCalls) {
        const updatedCalls = last.toolCalls.map((tc) => {
          if (tc.status === 'running' && tc.name === event.toolName) {
            return { ...tc, result: event.result, status: 'complete' as const };
          }
          return tc;
        });
        store.updateLastMessageToolCalls(updatedCalls);
      }
      break;
    }

    case 'message_complete':
      // Message is finalized; nothing extra to do since we streamed text in
      break;

    case 'error':
      store.appendToLastMessage(
        `\n\n[Error: ${event.message ?? 'Unknown error'}]`
      );
      break;
  }
}

function extractPdfIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const pdfId = params.get('pdf');
  if (pdfId) return pdfId;

  // Fallback: check path segments
  const segments = window.location.pathname.split('/').filter(Boolean);
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i] === 'pdf' || segments[i] === 'read' || segments[i] === 'reader') {
      return segments[i + 1];
    }
  }

  return null;
}
