import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, ArrowRight, RotateCw, X, Plus, Lock, Shield,
  Search, Star, Menu, PanelLeft,
} from "lucide-react";
import { useTabsStore } from "../stores/tabs";
import { useStatsStore } from "../stores/stats";

interface Props {
  onToggleMenu: () => void;
  onToggleSidebar: () => void;
}

export function Toolbar({ onToggleMenu, onToggleSidebar }: Props) {
  const { tabs, activeTabId, isPrivate, back, forward, reload, stop, navigate, newTab, setActive, closeTab } = useTabsStore();
  const { blockedCount } = useStatsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [addressValue, setAddressValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab && !editing) {
      setAddressValue(activeTab.url);
      checkBookmark(activeTab.url);
    }
  }, [activeTab?.url, editing]);

  const checkBookmark = async (url: string) => {
    const list = await window.veil.bookmarks.list();
    setBookmarked(list.some((b) => b.url === url));
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressValue.trim()) navigate(addressValue);
    inputRef.current?.blur();
    setEditing(false);
  };

  const toggleBookmark = async () => {
    if (!activeTab) return;
    if (bookmarked) {
      await window.veil.bookmarks.remove(activeTab.url);
      setBookmarked(false);
    } else {
      await window.veil.bookmarks.add({
        url: activeTab.url,
        title: activeTab.title || activeTab.url,
        addedAt: Date.now(),
      });
      setBookmarked(true);
    }
  };

  const isSecure = activeTab?.url.startsWith("https://") || activeTab?.url.startsWith("veil://");
  const isInternal = activeTab?.url.startsWith("veil://");

  return (
    <div className="flex flex-col border-b" style={{ background: isPrivate ? "rgba(26, 13, 32, 0.85)" : "rgba(15, 19, 26, 0.85)", borderColor: "rgba(37, 45, 63, 0.5)" }}>
      {/* Tab strip */}
      <div className="flex items-center gap-1 px-2 h-10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`group flex items-center gap-2 px-3 h-8 rounded-lg cursor-pointer transition-all duration-150 text-sm min-w-[140px] max-w-[220px] ${
              tab.id === activeTabId
                ? isPrivate
                  ? "bg-veil-700 text-veil-100 shadow-glow"
                  : "bg-veil-700 text-veil-100 shadow-glow"
                : "bg-veil-850 text-veil-300 hover:bg-veil-800"
            }`}
          >
            {tab.isLoading ? (
              <RotateCw size={12} className="spin text-veil-accent flex-shrink-0" />
            ) : tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" />
            ) : (
              <div className="w-3 h-3 rounded-sm bg-veil-600 flex-shrink-0" />
            )}
            <span className="flex-1 truncate text-left">{tab.title || tab.url || "New Tab"}</span>
            <span
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className="opacity-0 group-hover:opacity-100 hover:bg-veil-600 rounded p-0.5 flex-shrink-0"
            >
              <X size={12} />
            </span>
          </button>
        ))}
        <button onClick={() => newTab()} className="btn-icon-sm flex-shrink-0" title="New Tab (Ctrl+T)">
          <Plus size={16} />
        </button>
      </div>

      {/* Nav + address bar */}
      <div className="flex items-center gap-1 px-3 h-12">
        <button className="btn-icon-sm" onClick={onToggleSidebar} title="Toggle Sidebar">
          <PanelLeft size={16} />
        </button>
        <button
          className="btn-icon-sm disabled:opacity-30 disabled:hover:bg-transparent"
          onClick={back}
          disabled={!activeTab?.canGoBack}
          title="Back (Alt+Left)"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          className="btn-icon-sm disabled:opacity-30 disabled:hover:bg-transparent"
          onClick={forward}
          disabled={!activeTab?.canGoForward}
          title="Forward (Alt+Right)"
        >
          <ArrowRight size={16} />
        </button>
        <button
          className="btn-icon-sm"
          onClick={() => (activeTab?.isLoading ? stop() : reload())}
          title={activeTab?.isLoading ? "Stop" : "Reload (Ctrl+R)"}
        >
          {activeTab?.isLoading ? <X size={16} /> : <RotateCw size={16} />}
        </button>

        {/* Address bar */}
        <form onSubmit={handleNavigate} className="flex-1 mx-2 relative">
          <div
            className={`flex items-center gap-2 h-9 px-3 rounded-full border transition-all ${
              editing
                ? "border-veil-accent bg-veil-850 shadow-glow"
                : "border-veil-700 bg-veil-850 hover:border-veil-600"
            }`}
          >
            <div className="flex-shrink-0">
              {isInternal ? (
                <Shield size={14} className="text-veil-accent2" />
              ) : isSecure ? (
                <Lock size={14} className="text-veil-success" />
              ) : (
                <Search size={14} className="text-veil-warning" />
              )}
            </div>
            <input
              ref={inputRef}
              value={addressValue}
              onChange={(e) => setAddressValue(e.target.value)}
              onFocus={(e) => { setEditing(true); e.target.select(); }}
              onBlur={() => setEditing(false)}
              placeholder="Search privately or type a URL"
              className="flex-1 bg-transparent text-sm text-veil-100 placeholder-veil-500 focus:outline-none"
              spellCheck={false}
            />
            {blockedCount > 0 && (
              <button
                type="button"
                className="text-xs px-2 py-0.5 rounded-full bg-veil-700 text-veil-accent font-medium flex-shrink-0 flex items-center gap-1"
                title="Items blocked this session"
              >
                <Shield size={10} /> {blockedCount}
              </button>
            )}
          </div>
        </form>

        <button
          className={`btn-icon-sm ${bookmarked ? "text-veil-accent" : ""}`}
          onClick={toggleBookmark}
          title="Bookmark this page (Ctrl+D)"
        >
          <Star size={16} fill={bookmarked ? "currentColor" : "none"} />
        </button>
        <button className="btn-icon-sm" onClick={onToggleMenu} title="Menu">
          <Menu size={18} />
        </button>
      </div>
    </div>
  );
}
