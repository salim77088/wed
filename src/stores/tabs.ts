import { create } from "zustand";

export interface Tab {
  id: number;
  url: string;
  title: string;
  favicon: string | null;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isActive: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: number | null;
  init: () => Promise<void>;
  newTab: (url?: string) => Promise<void>;
  closeTab: (id: number) => Promise<void>;
  setActive: (id: number) => Promise<void>;
  navigate: (url: string) => Promise<void>;
  back: () => Promise<void>;
  forward: () => Promise<void>;
  reload: () => Promise<void>;
  stop: () => Promise<void>;
  updateTab: (tab: Partial<Tab> & { id: number }) => void;
  setActiveTabId: (id: number) => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  init: async () => {
    const list = await window.veil.tabs.list();
    set({ tabs: list, activeTabId: list.find((t) => t.isActive)?.id || list[0]?.id || null });

    window.veil.tabs.onUpdate((tab) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === tab.id ? { ...t, ...tab } : t)),
      }));
    });

    window.veil.tabs.onActiveChanged(({ activeTabId }) => {
      set((state) => ({
        activeTabId,
        tabs: state.tabs.map((t) => ({ ...t, isActive: t.id === activeTabId })),
      }));
    });
  },

  newTab: async (url) => {
    await window.veil.tabs.new(url);
  },

  closeTab: async (id) => {
    await window.veil.tabs.close(id);
    set((state) => ({ tabs: state.tabs.filter((t) => t.id !== id) }));
  },

  setActive: async (id) => {
    await window.veil.tabs.setActive(id);
  },

  navigate: async (url) => {
    const { activeTabId } = get();
    if (activeTabId) await window.veil.tabs.navigate(activeTabId, url);
  },

  back: async () => {
    const { activeTabId } = get();
    if (activeTabId) await window.veil.tabs.back(activeTabId);
  },

  forward: async () => {
    const { activeTabId } = get();
    if (activeTabId) await window.veil.tabs.forward(activeTabId);
  },

  reload: async () => {
    const { activeTabId } = get();
    if (activeTabId) await window.veil.tabs.reload(activeTabId);
  },

  stop: async () => {
    const { activeTabId } = get();
    if (activeTabId) await window.veil.tabs.stop(activeTabId);
  },

  updateTab: (tab) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tab.id ? { ...t, ...tab } : t)),
    }));
  },

  setActiveTabId: (id) => {
    set({ activeTabId: id });
  },
}));
