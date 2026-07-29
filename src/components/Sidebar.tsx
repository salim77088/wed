import { useEffect, useState } from "react";
import {
  Shield,
  History,
  Star,
  Download,
  Clock,
  Globe,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useStatsStore } from "../stores/stats";

interface Props {
  onOpenSettings: () => void;
}

interface HistoryItem {
  url: string;
  title: string;
  visitedAt: number;
}

interface Bookmark {
  url: string;
  title: string;
  addedAt: number;
}

export function Sidebar({ onOpenSettings }: Props) {
  const [view, setView] = useState<"home" | "history" | "bookmarks">("home");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const { blockedCount, trackerCount } = useStatsStore();

  useEffect(() => {
    window.veil.history.list().then(setHistory);
    window.veil.bookmarks.list().then(setBookmarks);
  }, [view]);

  return (
    <div className="w-60 bg-veil-900 border-r border-veil-800 flex flex-col">
      {/* Privacy stats hero */}
      <div className="p-3 border-b border-veil-800">
        <div className="bg-gradient-to-br from-veil-850 to-veil-800 rounded-xl p-3 border border-veil-700">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={14} className="text-veil-accent" />
            <span className="text-xs font-medium text-veil-300">Protection Active</span>
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
          <Globe size={14} />
          <span>Home</span>
        </button>
        <button
          onClick={() => setView("history")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            view === "history"
              ? "bg-veil-800 text-veil-100"
              : "text-veil-400 hover:bg-veil-850"
          }`}
        >
          <History size={14} />
          <span>History</span>
        </button>
        <button
          onClick={() => setView("bookmarks")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            view === "bookmarks"
              ? "bg-veil-800 text-veil-100"
              : "text-veil-400 hover:bg-veil-850"
          }`}
        >
          <Star size={14} />
          <span>Bookmarks</span>
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {view === "home" && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-veil-500 px-2">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm px-2 py-1.5">
                <span className="text-veil-400">Blocked</span>
                <span className="text-veil-accent font-medium">{blockedCount}</span>
              </div>
              <div className="flex justify-between text-sm px-2 py-1.5">
                <span className="text-veil-400">Trackers</span>
                <span className="text-veil-accent2 font-medium">{trackerCount}</span>
              </div>
            </div>
            <h3 className="text-xs uppercase tracking-wider text-veil-500 px-2 pt-2">
              Privacy Shield
            </h3>
            <div className="space-y-1.5 px-2">
              <div className="flex items-center gap-2 text-xs text-veil-300">
                <ShieldCheck size={12} className="text-veil-success" />
                Adblocker active
              </div>
              <div className="flex items-center gap-2 text-xs text-veil-300">
                <ShieldOff size={12} className="text-veil-success" />
                Fingerprint shield on
              </div>
              <div className="flex items-center gap-2 text-xs text-veil-300">
                <Clock size={12} className="text-veil-success" />
                DoH ready (toggle in Settings)
              </div>
            </div>
          </div>
        )}

        {view === "history" && (
          <div className="space-y-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs uppercase tracking-wider text-veil-500">Recent</h3>
              {history.length > 0 && (
                <button
                  onClick={async () => {
                    await window.veil.history.clear();
                    setHistory([]);
                  }}
                  className="text-xs text-veil-500 hover:text-veil-danger"
                >
                  Clear all
                </button>
              )}
            </div>
            {history.length === 0 && (
              <p className="text-xs text-veil-500 px-2 py-4">No history yet.</p>
            )}
            {history.slice(0, 50).map((item, i) => (
              <button
                key={i}
                onClick={() => window.veil.tabs.new(item.url)}
                className="block w-full text-left px-2 py-1.5 rounded hover:bg-veil-850 transition-colors"
              >
                <div className="text-xs text-veil-200 truncate">{item.title}</div>
                <div className="text-xs text-veil-500 truncate">{item.url}</div>
              </button>
            ))}
          </div>
        )}

        {view === "bookmarks" && (
          <div className="space-y-1">
            <h3 className="text-xs uppercase tracking-wider text-veil-500 mb-2">Saved</h3>
            {bookmarks.length === 0 && (
              <p className="text-xs text-veil-500 px-2 py-4">No bookmarks yet.</p>
            )}
            {bookmarks.map((b, i) => (
              <button
                key={i}
                onClick={() => window.veil.tabs.new(b.url)}
                className="block w-full text-left px-2 py-1.5 rounded hover:bg-veil-850 transition-colors"
              >
                <div className="text-xs text-veil-200 truncate">{b.title}</div>
                <div className="text-xs text-veil-500 truncate">{b.url}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-veil-800">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-veil-400 hover:bg-veil-850 hover:text-veil-100 transition-colors w-full"
        >
          <SettingsIcon size={14} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
