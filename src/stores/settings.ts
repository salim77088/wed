import { create } from "zustand";

export interface Settings {
  adblockEnabled: boolean;
  trackerBlockingEnabled: boolean;
  fingerprintingProtection: boolean;
  httpsOnly: boolean;
  dohEnabled: boolean;
  dohProvider: string;
  youtubeAdBlocking: boolean;
  searchEngine: string;
  homepage: string;
  theme: string;
  customFilterLists: string[];
  blockSocialWidgets: boolean;
  blockCookieNotices: boolean;
  suspendInactiveTabs: boolean;
  suspendAfterMinutes: number;
  cacheLimitMB: number;
  [key: string]: any;
}

interface SettingsState extends Settings {
  init: () => Promise<void>;
  set: (key: string, value: any) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  adblockEnabled: true,
  trackerBlockingEnabled: true,
  fingerprintingProtection: true,
  httpsOnly: true,
  dohEnabled: false,
  dohProvider: "cloudflare",
  youtubeAdBlocking: true,
  searchEngine: "duckduckgo",
  homepage: "veil://newtab",
  theme: "dark",
  customFilterLists: [],
  blockSocialWidgets: true,
  blockCookieNotices: false,
  suspendInactiveTabs: true,
  suspendAfterMinutes: 5,
  cacheLimitMB: 100,

  init: async () => {
    const all = await window.veil.settings.getAll();
    set(all);
  },

  set: async (key, value) => {
    await window.veil.settings.set(key, value);
    set({ [key]: value });
  },
}));
