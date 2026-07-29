import { useEffect, useState } from "react";
import {
  Shield, History, Star, Clock, Globe, Settings as SettingsIcon,
  ShieldCheck, ShieldOff, Download, Eye,
} from "lucide-react";
import { useStatsStore } from "../stores/stats";
import { useTabsStore } from "../stores/tabs";

interface Props {
  onOpenSettings: () => void;
}

interface HistoryItem { url: string; title: string; visitedAt: number; }
interface Bookmark { url: string; title: string; addedAt: number; }

export function Sidebar({ onOpenSettings }: Props) {
  const [view, setView] = useState<"home" | "history" | "bookmarks">("home");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const { blockedCount, trackerCount } = useStatsStore();
  const { newTab, isPrivate } = useTabsStore();

  useEffect(() => {
    if (view === "history") window.veil.history.list().then(setHistory);
    if (view === "bookmarks") window.veil.bookmarks.list().then(setBookmarks);
  }, [view]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div
      className="w-60 border-r flex flex-col"
      style={{
        background: isPrivate ? "rgba(26, 13, 32, 0.85)" : "rgba(15, 19, 26, 0.85)",
        borderColor: "rgba(37, 45, 63, 0.5)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Privacy stats hero */}
      <div className="p-3 border-b" style={{ borderColor: "rgba(37, 45, 63, 0.5)" }}>
        <div
          className="rounded-xl p-3 border"
          style={{
            background: isPrivate
              ? "linear-gradient(135deg, rgba(124, 92, 255, 0.15), rgba(239, 68, 68, 0.05))"
              : "linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(124, 92, 255, 0.05))",
            borderColor: isPrivate ? "rgba(124, 92, 255, 0.3)" : "rgba(0, 217, 255, 0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={14} className={isPrivate ? "text-veil-accent2" : "text-veil-accent"} />
            <span className="text-xs font-medium text-veil-300">
              {isPrivate ? "Private Mode Active" : "Protection Active"}
            </span>
          </div>
          <div className="text-2xl font-bold text-veil-accent">
            {blockedCount.toLocaleString()}
          </div>
          <div className="text-xs text-veil-400">trackers & ads blocked</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2">
        <button
          onClick={() => setView("home")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            view === "home" ? "bg-veil-800 text-veil-100" : "text-veil-400 hover:bg-veil-850"
          }`}
        >
          <Globe size={14} /> Home
        </button>
        <button
          onClick={() => setView("history")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            view === "history" ? "bg-veil-800 text-veil-100" : "text-veil-400 hover:bg-veil-850"
          }`}
        >
          <History size={14} /> History
        </button>
        <button
          onClick={() => setView("bookmarks")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            view === "bookmarks" ? "bg-veil-800 text-veil-100" : "text-veil-400 hover:bg-veil-850"
          }`}
        >
          <Star size={14} /> Bookmarks
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("veil:toggle-downloads"))}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-veil-400 hover:bg-veil-850 transition-colors"
        >
          <Download size={14} /> Downloads
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {view === "home" && (
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-wider text-veil-500 px-2 font-semibold">Quick Stats</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-xs px-2 py-1.5">
                <span className="text-veil-400">Blocked</span>
                <span className="text-veil-accent font-medium">{blockedCount}</span>
              </div>
              <div className="flex justify-between text-xs px-2 py-1.5">
                <span className="text-veil-400">Trackers</span>
                <span className="text-veil-accent2 font-medium">{trackerCount}</span>
              </div>
            </div>
            <h3 className="text-[10px] uppercase tracking-wider text-veil-500 px-2 pt-2 font-semibold">Privacy Shield</h3>
            <div className="space-y-1.5 px-2">
              <div className="flex items-center gap-2 text-xs text-veil-300">
                <ShieldCheck size={12} className="text-veil-success" /> Adblocker active
              </div>
              <div className="flex items-center gap-2 text-xs text-veil-300">
                <ShieldOff size={12} className="text-veil-success" /> Fingerprint shield on
              </div>
              <div className="flex items-center gap-2 text-xs text-veil-300">
                <Clock size={12} className="text-veil-success" /> HTTPS-Only enabled
              </div>
            </div>
          </div>
        )}

        {view === "history" && (
          <div className="space-y-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[10px] uppercase tracking-wider text-veil-500 font-semibold">Recent</h3>
              {history.length > 0 && (
                <button
                  onClick={async () => { await window.veil.history.clear(); setHistory([]); }}
                  className="text-[10px] text-veil-500 hover:text-veil-danger"
                >
                  Clear all
                </button>
              )}
            </div>
            {history.length === 0 && <p className="text-xs text-veil-500 px-2 py-4">No history yet.</p>}
            {history.slice(0, 50).map((item, i) => (
              <button
                key={i}
                onClick={() => newTab(item.url)}
                className="block w-full text-left px-2 py-1.5 rounded hover:bg-veil-850 transition-colors"
              >
                <div className="text-xs text-veil-200 truncate">{item.title}</div>
                <div className="text-[10px] text-veil-500 truncate">{formatTime(item.visitedAt)} · {item.url}</div>
              </button>
            ))}
          </div>
        )}

        {view === "bookmarks" && (
          <div className="space-y-1">
            <h3 className="text-[10px] uppercase tracking-wider text-veil-500 mb-2 font-semibold">Saved</h3>
            {bookmarks.length === 0 && <p className="text-xs text-veil-500 px-2 py-4">No bookmarks yet.</p>}
            {bookmarks.map((b, i) => (
              <button
                key={i}
                onClick={() => newTab(b.url)}
                className="block w-full text-left px-2 py-1.5 rounded hover:bg-veil-850 transition-colors"
              >
                <div className="text-xs text-veil-200 truncate">{b.title}</div>
                <div className="text-[10px] text-veil-500 truncate">{b.url}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t" style={{ borderColor: "rgba(37, 45, 63, 0.5)" }}>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-veil-400 hover:bg-veil-850 hover:text-veil-100 transition-colors w-full"
        >
          <SettingsIcon size={14} /> Settings
        </button>
      </div>
    </div>
  );
}
