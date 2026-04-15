import { Snapshot } from './pdf';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  snapshot?: Snapshot;
  attachedFiles?: AttachedFile[];
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

export interface AttachedFile {
  name: string;
  contentBase64: string;
  mimeType: string;
  size: number;
}

export interface Session {
  id: string;
  pdfId: string;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'ended';
  viewedPages: number[];
  messages: ChatMessage[];
}

export interface SessionCreateResponse {
  sessionId: string;
  vaultContext: string;
  priorConcepts: string[];
}
