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

export interface VeilDownload {
  id: string;
  filename: string;
  url: string;
  savePath: string;
  totalBytes: number;
  receivedBytes: number;
  state: "progressing" | "completed" | "interrupted" | "cancelled";
  startTime: number;
  endTime?: number;
}

export interface VeilAppInfo {
  platform: "win32" | "darwin" | "linux";
  version: string;
  electron: string;
  chrome: string;
  node: string;
  userData: string;
}

export interface VeilAPI {
  platform: "win32" | "darwin" | "linux";
  versions: { electron: string; chrome: string; node: string };

  app: {
    info: () => Promise<VeilAppInfo>;
    quit: () => Promise<void>;
  };

  windows: {
    new: (isPrivate?: boolean) => Promise<number>;
    close: (windowId: number) => Promise<void>;
    minimize: (windowId: number) => Promise<void>;
    maximize: (windowId: number) => Promise<void>;
    isMaximized: (windowId: number) => Promise<boolean>;
  };

  window: {
    getId: () => { windowId: number | null; isPrivate: boolean };
  };

  tabs: {
    new: (windowId: number, url?: string) => Promise<number>;
    close: (windowId: number, id: number) => Promise<void>;
    setActive: (windowId: number, id: number) => Promise<void>;
    navigate: (windowId: number, id: number, url: string) => Promise<void>;
    back: (windowId: number, id: number) => Promise<void>;
    forward: (windowId: number, id: number) => Promise<void>;
    reload: (windowId: number, id: number, bypassCache?: boolean) => Promise<void>;
    stop: (windowId: number, id: number) => Promise<void>;
    list: (windowId: number) => Promise<VeilTab[]>;
    print: (windowId: number, id: number) => Promise<void>;
    zoom: (windowId: number, id: number, delta: number, reset?: boolean) => Promise<void>;
    find: (windowId: number, id: number, query: string) => Promise<void>;
    findStop: (windowId: number, id: number) => Promise<void>;
    savePage: (windowId: number, id: number) => Promise<void>;
    share: (windowId: number, id: number) => Promise<void>;
    devtools: (windowId: number, id: number) => Promise<void>;
  };

  settings: {
    get: (key: string) => Promise<any>;
    getAll: () => Promise<Record<string, any>>;
    set: (key: string, value: any) => Promise<boolean>;
  };

  history: {
    list: () => Promise<VeilHistoryItem[]>;
    clear: () => Promise<boolean>;
    remove: (url: string) => Promise<boolean>;
  };

  bookmarks: {
    list: () => Promise<VeilBookmark[]>;
    add: (b: VeilBookmark) => Promise<boolean>;
    remove: (url: string) => Promise<boolean>;
  };

  downloads: {
    list: () => Promise<VeilDownload[]>;
    clear: () => Promise<boolean>;
    open: (path: string) => Promise<void>;
    show: (path: string) => Promise<void>;
    onUpdated: (cb: (downloads: VeilDownload[]) => void) => void;
  };

  data: {
    clear: (opts: {
      history?: boolean;
      cache?: boolean;
      cookies?: boolean;
      localStorage?: boolean;
      sessionStorage?: boolean;
      indexedDB?: boolean;
      downloads?: boolean;
      all?: boolean;
    }) => Promise<boolean>;
  };

  stats: {
    get: () => Promise<VeilStats>;
    onUpdate: (cb: (s: VeilStats) => void) => void;
  };

  shell: {
    open: (url: string) => Promise<void>;
  };

  on: (channel: string, cb: (data: any) => void) => void;
}

declare global {
  interface Window {
    veil: VeilAPI;
  }
}

export {};
