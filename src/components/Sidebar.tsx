import { useEffect, useState } from "react";
import {
  Shield, History, Star, Clock, Globe, Settings as SettingsIcon,
  ShieldCheck, Download, Eye, Plus, Search, Trash2,
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
  const [search, setSearch] = useState("");
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

  const filteredHistory = history.filter(h =>
    !search || h.title?.toLowerCase().includes(search.toLowerCase()) || h.url.toLowerCase().includes(search.toLowerCase())
  );
  const filteredBookmarks = bookmarks.filter(b =>
    !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="w-60 border-r flex flex-col flex-shrink-0 animate-fade-in"
      style={{
        background: isPrivate ? "rgba(26, 13, 32, 0.9)" : "var(--veil-toolbar)",
        borderColor: "var(--veil-border)",
      }}
    >
      {/* Header with privacy stats */}
      <div className="p-3 border-b" style={{ borderColor: "var(--veil-border)" }}>
        <div
          className="rounded-xl p-3 border"
          style={{
            background: isPrivate
              ? "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(124, 58, 237, 0.04))"
              : "linear-gradient(135deg, rgba(79, 158, 255, 0.08), rgba(37, 99, 235, 0.03))",
            borderColor: isPrivate ? "rgba(168, 85, 247, 0.2)" : "rgba(79, 158, 255, 0.15)",
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={13} className={isPrivate ? "text-veil-private" : "text-veil-accent"} />
              <span className="text-[11px] font-medium text-veil-300">
                {isPrivate ? "Private Mode" : "Protected"}
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-veil-100 tabular-nums">
              {blockedCount.toLocaleString()}
            </span>
            <span className="text-[11px] text-veil-400">blocked</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 p-2">
        <NavButton active={view === "home"} onClick={() => setView("home")} icon={<Globe size={15} />} label="Home" />
        <NavButton active={view === "history"} onClick={() => setView("history")} icon={<History size={15} />} label="History" />
        <NavButton active={view === "bookmarks"} onClick={() => setView("bookmarks")} icon={<Star size={15} />} label="Bookmarks" />
        <NavButton
          onClick={() => window.dispatchEvent(new CustomEvent("veil:toggle-downloads"))}
          icon={<Download size={15} />}
          label="Downloads"
        />
      </nav>

      {/* Search box (for history/bookmarks views) */}
      {view !== "home" && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-veil-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${view}...`}
              className="w-full h-7 pl-8 pr-2 rounded-md bg-veil-850 border border-veil-700 text-[12px] text-veil-100 placeholder-veil-500 focus:outline-none focus:border-veil-accent"
            />
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {view === "home" && (
          <div className="space-y-3 pt-1">
            <SectionLabel>Privacy Shield</SectionLabel>
            <div className="space-y-0.5 px-1">
              <StatRow icon={<Shield size={12} />} label="Ad & tracker blocking" value="On" color="text-veil-success" />
              <StatRow icon={<Eye size={12} />} label="Fingerprint protection" value="On" color="text-veil-success" />
              <StatRow icon={<Clock size={12} />} label="HTTPS-only mode" value="On" color="text-veil-success" />
              <StatRow icon={<Shield size={12} />} label="Trackers blocked" value={trackerCount.toString()} color="text-veil-accent" />
            </div>

            <SectionLabel>Quick Actions</SectionLabel>
            <div className="space-y-0.5">
              <NavButton onClick={() => newTab()} icon={<Plus size={15} />} label="New Tab" small />
              <NavButton onClick={() => onOpenSettings()} icon={<SettingsIcon size={15} />} label="Settings" small />
            </div>
          </div>
        )}

        {view === "history" && (
          <div className="space-y-0.5 pt-1">
            <div className="flex justify-between items-center px-1 mb-1">
              <SectionLabel noMargin>Recent</SectionLabel>
              {history.length > 0 && (
                <button
                  onClick={async () => { await window.veil.history.clear(); setHistory([]); }}
                  className="text-[11px] text-veil-500 hover:text-veil-danger flex items-center gap-1"
                >
                  <Trash2 size={11} /> Clear
                </button>
              )}
            </div>
            {filteredHistory.length === 0 && <EmptyState text="No history yet" />}
            {filteredHistory.slice(0, 50).map((item, i) => (
              <button
                key={i}
                onClick={() => newTab(item.url)}
                className="block w-full text-left px-2 py-1.5 rounded-md hover:bg-veil-800 transition-colors group"
              >
                <div className="text-[12px] text-veil-200 truncate">{item.title || item.url}</div>
                <div className="text-[10px] text-veil-500 truncate flex items-center gap-1">
                  <span>{formatTime(item.visitedAt)}</span>
                  <span className="opacity-0 group-hover:opacity-100">· {new URL(item.url).hostname}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {view === "bookmarks" && (
          <div className="space-y-0.5 pt-1">
            <SectionLabel noMargin>Saved Pages</SectionLabel>
            {filteredBookmarks.length === 0 && <EmptyState text="No bookmarks yet" />}
            {filteredBookmarks.map((b, i) => (
              <button
                key={i}
                onClick={() => newTab(b.url)}
                className="block w-full text-left px-2 py-1.5 rounded-md hover:bg-veil-800 transition-colors group flex items-start gap-2"
              >
                <Star size={11} className="text-veil-warning mt-0.5 flex-shrink-0" fill="currentColor" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-veil-200 truncate">{b.title}</div>
                  <div className="text-[10px] text-veil-500 truncate">{b.url}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer — Settings */}
      <div className="p-2 border-t" style={{ borderColor: "var(--veil-border)" }}>
        <NavButton onClick={onOpenSettings} icon={<SettingsIcon size={15} />} label="Settings" />
      </div>
    </div>
  );
}

function NavButton({
  active, onClick, icon, label, small,
}: { active?: boolean; onClick: () => void; icon: React.ReactNode; label: string; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 ${small ? "px-2 py-1.5 text-[12px]" : "px-2.5 py-2 text-[13px]"} rounded-md transition-colors w-full text-left ${
        active ? "bg-veil-800 text-veil-100" : "text-veil-300 hover:bg-veil-850 hover:text-veil-100"
      }`}
    >
      <span className={active ? "text-veil-accent" : "text-veil-500"}>{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

function SectionLabel({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <h3 className={`text-[10px] uppercase tracking-wider text-veil-500 font-semibold px-1 ${noMargin ? "" : "mb-1"}`}>
      {children}
    </h3>
  );
}

function StatRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-1 px-1 text-[12px]">
      <div className="flex items-center gap-2 text-veil-300">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-[12px] text-veil-500 px-2 py-4 text-center">{text}</p>;
}
