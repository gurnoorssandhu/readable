import { useSessionStore } from '@/store/sessionStore';
import type { ChatMessage, AttachedFile } from '@/types/session';
import type { Snapshot } from '@/types/pdf';

function makeMessage(
  role: 'user' | 'assistant',
  content: string
): ChatMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    timestamp: Date.now(),
  };
}

const sampleSnapshot: Snapshot = {
  imageBase64: 'abc123',
  pageNumber: 3,
  rect: { x: 0, y: 0, w: 100, h: 100 },
  timestamp: Date.now(),
};

const sampleFile: AttachedFile = {
  name: 'notes.txt',
  contentBase64: Buffer.from('hello').toString('base64'),
  mimeType: 'text/plain',
  size: 5,
};

beforeEach(() => {
  useSessionStore.setState({
    sessionId: null,
    isCoReading: false,
    viewedPages: new Set<number>(),
    visiblePages: new Set<number>(),
    messages: [],
    pendingSnapshot: null,
    attachedFiles: [],
    isStreaming: false,
    vaultContext: null,
  });
});

describe('useSessionStore', () => {
  describe('startSession', () => {
    it('sets sessionId, isCoReading, and vaultContext', () => {
      useSessionStore.getState().startSession('sess-1', 'vault context');
      const state = useSessionStore.getState();
      expect(state.sessionId).toBe('sess-1');
      expect(state.isCoReading).toBe(true);
      expect(state.vaultContext).toBe('vault context');
    });

    it('resets viewedPages, visiblePages, messages, and attachedFiles', () => {
      // Set some state first
      useSessionStore.getState().addMessage(makeMessage('user', 'hello'));
      useSessionStore.getState().addViewedPage(5);
      useSessionStore.getState().addAttachedFile(sampleFile);

      // Start a new session
      useSessionStore.getState().startSession('sess-2', 'ctx');
      const state = useSessionStore.getState();
      expect(state.viewedPages.size).toBe(0);
      expect(state.visiblePages.size).toBe(0);
      expect(state.messages.length).toBe(0);
      expect(state.attachedFiles.length).toBe(0);
    });

    it('sets isStreaming to false', () => {
      useSessionStore.setState({ isStreaming: true });
      useSessionStore.getState().startSession('sess-1', 'ctx');
      expect(useSessionStore.getState().isStreaming).toBe(false);
    });
  });

  describe('endSession', () => {
    it('resets all session state', () => {
      useSessionStore.getState().startSession('sess-1', 'ctx');
      useSessionStore.getState().addMessage(makeMessage('user', 'hi'));
      useSessionStore.getState().addViewedPage(1);

      useSessionStore.getState().endSession();
      const state = useSessionStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.isCoReading).toBe(false);
      expect(state.vaultContext).toBeNull();
      expect(state.messages.length).toBe(0);
      expect(state.viewedPages.size).toBe(0);
      expect(state.visiblePages.size).toBe(0);
      expect(state.attachedFiles.length).toBe(0);
      expect(state.pendingSnapshot).toBeNull();
      expect(state.isStreaming).toBe(false);
    });
  });

  describe('addViewedPage', () => {
    it('adds a page to the viewedPages set', () => {
      useSessionStore.getState().addViewedPage(3);
      expect(useSessionStore.getState().viewedPages.has(3)).toBe(true);
    });

    it('does not duplicate pages', () => {
      useSessionStore.getState().addViewedPage(3);
      useSessionStore.getState().addViewedPage(3);
      expect(useSessionStore.getState().viewedPages.size).toBe(1);
    });

    it('accumulates multiple pages', () => {
      useSessionStore.getState().addViewedPage(1);
      useSessionStore.getState().addViewedPage(2);
      useSessionStore.getState().addViewedPage(3);
      expect(useSessionStore.getState().viewedPages.size).toBe(3);
    });
  });

  describe('setVisiblePages', () => {
    it('sets the visible pages set', () => {
      useSessionStore.getState().setVisiblePages([2, 3, 4]);
      const visible = useSessionStore.getState().visiblePages;
      expect(visible.has(2)).toBe(true);
      expect(visible.has(3)).toBe(true);
      expect(visible.has(4)).toBe(true);
      expect(visible.size).toBe(3);
    });

    it('replaces previous visible pages', () => {
      useSessionStore.getState().setVisiblePages([1, 2]);
      useSessionStore.getState().setVisiblePages([3, 4]);
      const visible = useSessionStore.getState().visiblePages;
      expect(visible.has(1)).toBe(false);
      expect(visible.has(3)).toBe(true);
      expect(visible.size).toBe(2);
    });

    it('also adds visible pages to viewedPages', () => {
      useSessionStore.getState().setVisiblePages([5, 6]);
      const viewed = useSessionStore.getState().viewedPages;
      expect(viewed.has(5)).toBe(true);
      expect(viewed.has(6)).toBe(true);
    });

    it('accumulates viewed pages across multiple setVisiblePages calls', () => {
      useSessionStore.getState().setVisiblePages([1, 2]);
      useSessionStore.getState().setVisiblePages([3, 4]);
      const viewed = useSessionStore.getState().viewedPages;
      // All pages from both calls should be in viewedPages
      expect(viewed.has(1)).toBe(true);
      expect(viewed.has(2)).toBe(true);
      expect(viewed.has(3)).toBe(true);
      expect(viewed.has(4)).toBe(true);
    });
  });

  describe('addMessage', () => {
    it('appends a message to the messages array', () => {
      const msg = makeMessage('user', 'Hello');
      useSessionStore.getState().addMessage(msg);
      expect(useSessionStore.getState().messages.length).toBe(1);
      expect(useSessionStore.getState().messages[0].content).toBe('Hello');
    });

    it('preserves existing messages when adding new ones', () => {
      useSessionStore.getState().addMessage(makeMessage('user', 'first'));
      useSessionStore.getState().addMessage(makeMessage('assistant', 'second'));
      const msgs = useSessionStore.getState().messages;
      expect(msgs.length).toBe(2);
      expect(msgs[0].content).toBe('first');
      expect(msgs[1].content).toBe('second');
    });
  });

  describe('appendToLastMessage', () => {
    it('appends text to the last message content', () => {
      useSessionStore.getState().addMessage(makeMessage('assistant', 'Hello'));
      useSessionStore.getState().appendToLastMessage(' world');
      expect(useSessionStore.getState().messages[0].content).toBe('Hello world');
    });

    it('only modifies the last message', () => {
      useSessionStore.getState().addMessage(makeMessage('user', 'first'));
      useSessionStore.getState().addMessage(makeMessage('assistant', 'second'));
      useSessionStore.getState().appendToLastMessage(' appended');
      const msgs = useSessionStore.getState().messages;
      expect(msgs[0].content).toBe('first');
      expect(msgs[1].content).toBe('second appended');
    });

    it('does nothing when there are no messages', () => {
      useSessionStore.getState().appendToLastMessage('delta');
      expect(useSessionStore.getState().messages.length).toBe(0);
    });
  });

  describe('setSnapshot', () => {
    it('sets the pending snapshot', () => {
      useSessionStore.getState().setSnapshot(sampleSnapshot);
      expect(useSessionStore.getState().pendingSnapshot).toEqual(sampleSnapshot);
    });

    it('can clear the snapshot by setting null', () => {
      useSessionStore.getState().setSnapshot(sampleSnapshot);
      useSessionStore.getState().setSnapshot(null);
      expect(useSessionStore.getState().pendingSnapshot).toBeNull();
    });
  });

  describe('addAttachedFile', () => {
    it('adds a file to the attachedFiles array', () => {
      useSessionStore.getState().addAttachedFile(sampleFile);
      expect(useSessionStore.getState().attachedFiles.length).toBe(1);
      expect(useSessionStore.getState().attachedFiles[0].name).toBe('notes.txt');
    });

    it('accumulates multiple files', () => {
      useSessionStore.getState().addAttachedFile(sampleFile);
      useSessionStore.getState().addAttachedFile({
        ...sampleFile,
        name: 'other.txt',
      });
      expect(useSessionStore.getState().attachedFiles.length).toBe(2);
    });
  });

  describe('removeAttachedFile', () => {
    it('removes a file by name', () => {
      useSessionStore.getState().addAttachedFile(sampleFile);
      useSessionStore.getState().removeAttachedFile('notes.txt');
      expect(useSessionStore.getState().attachedFiles.length).toBe(0);
    });

    it('only removes the matching file', () => {
      useSessionStore.getState().addAttachedFile(sampleFile);
      useSessionStore.getState().addAttachedFile({
        ...sampleFile,
        name: 'other.txt',
      });
      useSessionStore.getState().removeAttachedFile('notes.txt');
      const files = useSessionStore.getState().attachedFiles;
      expect(files.length).toBe(1);
      expect(files[0].name).toBe('other.txt');
    });

    it('does nothing if the file name does not match', () => {
      useSessionStore.getState().addAttachedFile(sampleFile);
      useSessionStore.getState().removeAttachedFile('nonexistent.txt');
      expect(useSessionStore.getState().attachedFiles.length).toBe(1);
    });
  });
});
