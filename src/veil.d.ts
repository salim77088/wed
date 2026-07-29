// Type declarations for window.veil — exposed via Electron contextBridge (preload.cjs)

export interface VeilTab {
  id: number;
  url: string;
  title: string;
  favicon: string | null;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isActive: boolean;
}

export interface VeilStats {
  blockedCount: number;
  trackerCount: number;
}

export interface VeilBookmark {
  url: string;
  title: string;
  addedAt: number;
}

export interface VeilHistoryItem {
  url: string;
  title: string;
  visitedAt: number;
}

export interface VeilAPI {
  platform: "win32" | "darwin" | "linux";
  isDev: boolean;
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };

  tabs: {
    new: (url?: string) => Promise<number>;
    close: (id: number) => Promise<void>;
    setActive: (id: number) => Promise<void>;
    navigate: (id: number, url: string) => Promise<void>;
    back: (id: number) => Promise<void>;
    forward: (id: number) => Promise<void>;
    reload: (id: number) => Promise<void>;
    stop: (id: number) => Promise<void>;
    list: () => Promise<VeilTab[]>;
    onUpdate: (cb: (tab: VeilTab) => void) => void;
    onActiveChanged: (cb: (data: { activeTabId: number }) => void) => void;
    onListChanged: (cb: (tabs: VeilTab[]) => void) => void;
  };

  settings: {
    get: (key: string) => Promise<any>;
    getAll: () => Promise<Record<string, any>>;
    set: (key: string, value: any) => Promise<boolean>;
  };

  history: {
    list: () => Promise<VeilHistoryItem[]>;
    clear: () => Promise<boolean>;
  };

  bookmarks: {
    list: () => Promise<VeilBookmark[]>;
    add: (b: VeilBookmark) => Promise<boolean>;
    remove: (url: string) => Promise<boolean>;
  };

  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };

  stats: {
    get: () => Promise<VeilStats>;
    onUpdate: (cb: (s: VeilStats) => void) => void;
  };
}

declare global {
  interface Window {
    veil: VeilAPI;
  }
}

export {};
