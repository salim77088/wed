import { create } from "zustand";

interface StatsState {
  blockedCount: number;
  trackerCount: number;
  init: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  blockedCount: 0,
  trackerCount: 0,

  init: async () => {
    const stats = await window.veil.stats.get();
    set(stats);
    window.veil.stats.onUpdate((s) => set(s));
  },
}));
