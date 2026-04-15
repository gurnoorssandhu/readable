import { Snapshot, PdfMeta } from './pdf';
import { AttachedFile } from './session';

export interface ChatRequest {
  sessionId: string;
  message: string;
  snapshot?: Snapshot;
  attachedFiles?: AttachedFile[];
  viewedPages: number[];
  visiblePages: number[];
  pdfId: string;
}

export interface ChatStreamEvent {
  type: 'text_delta' | 'tool_use_start' | 'tool_use_result' | 'message_complete' | 'error';
  text?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  result?: string;
  messageId?: string;
  message?: string;
}

export interface ContextBudget {
  systemPrompt: number;
  vaultContext: number;
  pageText: number;
  pageImages: number;
  snapshot: number;
  conversationHistory: number;
  attachedFiles: number;
  responseHeadroom: number;
}

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  systemPrompt: 5000,
  vaultContext: 10000,
  pageText: 40000,
  pageImages: 15000,
  snapshot: 3000,
  conversationHistory: 60000,
  attachedFiles: 15000,
  responseHeadroom: 2000,
};
