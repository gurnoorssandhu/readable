import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  chatPanelOpen: boolean;
  snapshotMode: boolean;

  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setSnapshotMode: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setChatPanelOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  chatPanelOpen: false,
  snapshotMode: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleChatPanel: () => set((state) => ({ chatPanelOpen: !state.chatPanelOpen })),
  setSnapshotMode: (v) => set({ snapshotMode: v }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setChatPanelOpen: (v) => set({ chatPanelOpen: v }),
}));
