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
  windowId: number | null;
  isPrivate: boolean;
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
  print: () => Promise<void>;
  zoomIn: () => Promise<void>;
  zoomOut: () => Promise<void>;
  zoomReset: () => Promise<void>;
  findInPage: (query: string) => Promise<void>;
  findStop: () => Promise<void>;
  savePage: () => Promise<void>;
  share: () => Promise<void>;
  devtools: () => Promise<void>;
  updateTab: (tab: Partial<Tab> & { id: number }) => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  windowId: null,
  isPrivate: false,
  tabs: [],
  activeTabId: null,

  init: async () => {
    // Wait for window:init event from main
    window.veil.on("window:init", async (data: { windowId: number; isPrivate: boolean }) => {
      set({ windowId: data.windowId, isPrivate: data.isPrivate });
      const list = await window.veil.tabs.list(data.windowId);
      set({ tabs: list, activeTabId: list.find((t) => t.isActive)?.id || list[0]?.id || null });
    });

    window.veil.on("tab:update", (tab: Tab) => {
      set((state) => ({
        tabs: state.tabs.some((t) => t.id === tab.id)
          ? state.tabs.map((t) => (t.id === tab.id ? { ...t, ...tab } : t))
          : [...state.tabs, tab],
      }));
    });

    window.veil.on("tab:active-changed", ({ activeTabId }: { activeTabId: number }) => {
      set((state) => ({
        activeTabId,
        tabs: state.tabs.map((t) => ({ ...t, isActive: t.id === activeTabId })),
      }));
    });

    window.veil.on("menu:new-tab", () => get().newTab());
    window.veil.on("menu:close-tab", () => {
      const { activeTabId } = get();
      if (activeTabId) get().closeTab(activeTabId);
    });
    window.veil.on("menu:back", () => get().back());
    window.veil.on("menu:forward", () => get().forward());
    window.veil.on("menu:devtools", () => get().devtools());
    window.veil.on("menu:open-history", () => get().newTab("veil://history"));
    window.veil.on("menu:clear-data", () => {
      // Triggered via menu — dispatch event for App to show dialog
      window.dispatchEvent(new CustomEvent("veil:clear-data"));
    });
  },

  newTab: async (url) => {
    const { windowId } = get();
    if (windowId === null) return;
    await window.veil.tabs.new(windowId, url);
  },

  closeTab: async (id) => {
    const { windowId } = get();
    if (windowId === null) return;
    await window.veil.tabs.close(windowId, id);
    set((state) => ({ tabs: state.tabs.filter((t) => t.id !== id) }));
  },

  setActive: async (id) => {
    const { windowId } = get();
    if (windowId === null) return;
    await window.veil.tabs.setActive(windowId, id);
  },

  navigate: async (url) => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.navigate(windowId, activeTabId, url);
  },

  back: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.back(windowId, activeTabId);
  },

  forward: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.forward(windowId, activeTabId);
  },

  reload: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.reload(windowId, activeTabId);
  },

  stop: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.stop(windowId, activeTabId);
  },

  print: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.print(windowId, activeTabId);
  },

  zoomIn: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.zoom(windowId, activeTabId, 0.1);
  },

  zoomOut: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.zoom(windowId, activeTabId, -0.1);
  },

  zoomReset: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.zoom(windowId, activeTabId, 0, true);
  },

  findInPage: async (query) => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.find(windowId, activeTabId, query);
  },

  findStop: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.findStop(windowId, activeTabId);
  },

  savePage: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.savePage(windowId, activeTabId);
  },

  share: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.share(windowId, activeTabId);
  },

  devtools: async () => {
    const { windowId, activeTabId } = get();
    if (windowId === null || activeTabId === null) return;
    await window.veil.tabs.devtools(windowId, activeTabId);
  },

  updateTab: (tab) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tab.id ? { ...t, ...tab } : t)),
    }));
  },
}));
