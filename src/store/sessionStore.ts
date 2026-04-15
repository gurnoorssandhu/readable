import { create } from 'zustand';
import { ChatMessage, AttachedFile } from '@/types/session';
import { Snapshot } from '@/types/pdf';

interface SessionState {
  sessionId: string | null;
  isCoReading: boolean;
  viewedPages: Set<number>;
  visiblePages: Set<number>;
  messages: ChatMessage[];
  pendingSnapshot: Snapshot | null;
  attachedFiles: AttachedFile[];
  isStreaming: boolean;
  vaultContext: string | null;

  startSession: (sessionId: string, vaultCtx: string) => void;
  endSession: () => void;
  addViewedPage: (page: number) => void;
  addViewedPages: (pages: number[]) => void;
  setVisiblePages: (pages: number[]) => void;
  addMessage: (msg: ChatMessage) => void;
  appendToLastMessage: (delta: string) => void;
  updateLastMessageToolCalls: (toolCall: ChatMessage['toolCalls']) => void;
  setSnapshot: (s: Snapshot | null) => void;
  addAttachedFile: (f: AttachedFile) => void;
  removeAttachedFile: (name: string) => void;
  setIsStreaming: (v: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  isCoReading: false,
  viewedPages: new Set<number>(),
  visiblePages: new Set<number>(),
  messages: [],
  pendingSnapshot: null,
  attachedFiles: [],
  isStreaming: false,
  vaultContext: null,

  startSession: (sessionId, vaultCtx) =>
    set({
      sessionId,
      isCoReading: true,
      vaultContext: vaultCtx,
      viewedPages: new Set<number>(),
      visiblePages: new Set<number>(),
      messages: [],
      pendingSnapshot: null,
      attachedFiles: [],
      isStreaming: false,
    }),

  endSession: () =>
    set({
      sessionId: null,
      isCoReading: false,
      vaultContext: null,
      viewedPages: new Set<number>(),
      visiblePages: new Set<number>(),
      messages: [],
      pendingSnapshot: null,
      attachedFiles: [],
      isStreaming: false,
    }),

  addViewedPage: (page) =>
    set((state) => {
      const newSet = new Set(state.viewedPages);
      newSet.add(page);
      return { viewedPages: newSet };
    }),

  addViewedPages: (pages) =>
    set((state) => {
      const newSet = new Set(state.viewedPages);
      pages.forEach((p) => newSet.add(p));
      return { viewedPages: newSet };
    }),

  setVisiblePages: (pages) =>
    set((state) => {
      const newSet = new Set(pages);
      const newViewed = new Set(state.viewedPages);
      pages.forEach((p) => newViewed.add(p));
      return { visiblePages: newSet, viewedPages: newViewed };
    }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  appendToLastMessage: (delta) =>
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length > 0) {
        const last = { ...msgs[msgs.length - 1] };
        last.content += delta;
        msgs[msgs.length - 1] = last;
      }
      return { messages: msgs };
    }),

  updateLastMessageToolCalls: (toolCalls) =>
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length > 0) {
        const last = { ...msgs[msgs.length - 1] };
        last.toolCalls = toolCalls;
        msgs[msgs.length - 1] = last;
      }
      return { messages: msgs };
    }),

  setSnapshot: (s) => set({ pendingSnapshot: s }),

  addAttachedFile: (f) =>
    set((state) => ({ attachedFiles: [...state.attachedFiles, f] })),

  removeAttachedFile: (name) =>
    set((state) => ({
      attachedFiles: state.attachedFiles.filter((f) => f.name !== name),
    })),

  setIsStreaming: (v) => set({ isStreaming: v }),
}));
