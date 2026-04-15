import { useUiStore } from '@/store/uiStore';

beforeEach(() => {
  useUiStore.setState({
    sidebarOpen: false,
    chatPanelOpen: false,
    snapshotMode: false,
  });
});

describe('useUiStore', () => {
  describe('toggleSidebar', () => {
    it('toggles sidebarOpen from false to true', () => {
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(true);
    });

    it('toggles sidebarOpen from true to false', () => {
      useUiStore.setState({ sidebarOpen: true });
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(false);
    });

    it('does not affect other state properties', () => {
      useUiStore.setState({ chatPanelOpen: true, snapshotMode: true });
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().chatPanelOpen).toBe(true);
      expect(useUiStore.getState().snapshotMode).toBe(true);
    });
  });

  describe('toggleChatPanel', () => {
    it('toggles chatPanelOpen from false to true', () => {
      useUiStore.getState().toggleChatPanel();
      expect(useUiStore.getState().chatPanelOpen).toBe(true);
    });

    it('toggles chatPanelOpen from true to false', () => {
      useUiStore.setState({ chatPanelOpen: true });
      useUiStore.getState().toggleChatPanel();
      expect(useUiStore.getState().chatPanelOpen).toBe(false);
    });

    it('does not affect other state properties', () => {
      useUiStore.setState({ sidebarOpen: true, snapshotMode: true });
      useUiStore.getState().toggleChatPanel();
      expect(useUiStore.getState().sidebarOpen).toBe(true);
      expect(useUiStore.getState().snapshotMode).toBe(true);
    });
  });

  describe('setSnapshotMode', () => {
    it('sets snapshotMode to true', () => {
      useUiStore.getState().setSnapshotMode(true);
      expect(useUiStore.getState().snapshotMode).toBe(true);
    });

    it('sets snapshotMode to false', () => {
      useUiStore.setState({ snapshotMode: true });
      useUiStore.getState().setSnapshotMode(false);
      expect(useUiStore.getState().snapshotMode).toBe(false);
    });

    it('does not affect other state properties', () => {
      useUiStore.setState({ sidebarOpen: true, chatPanelOpen: true });
      useUiStore.getState().setSnapshotMode(true);
      expect(useUiStore.getState().sidebarOpen).toBe(true);
      expect(useUiStore.getState().chatPanelOpen).toBe(true);
    });
  });

  describe('setSidebarOpen', () => {
    it('sets sidebarOpen directly', () => {
      useUiStore.getState().setSidebarOpen(true);
      expect(useUiStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('setChatPanelOpen', () => {
    it('sets chatPanelOpen directly', () => {
      useUiStore.getState().setChatPanelOpen(true);
      expect(useUiStore.getState().chatPanelOpen).toBe(true);
    });
  });

  describe('multiple toggles', () => {
    it('returns to original state after double toggle', () => {
      useUiStore.getState().toggleSidebar();
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(false);

      useUiStore.getState().toggleChatPanel();
      useUiStore.getState().toggleChatPanel();
      expect(useUiStore.getState().chatPanelOpen).toBe(false);
    });
  });
});
