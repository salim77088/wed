import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, ArrowRight, RotateCw, X, Plus, Lock, Shield,
  Search, Star, PanelLeft, MoreVertical, Download,
  ZoomIn, Globe, Minus, Square,
} from "lucide-react";
import { useTabsStore } from "../stores/tabs";
import { useStatsStore } from "../stores/stats";

interface Props {
  onToggleMenu: (pos?: { x: number; y: number }) => void;
  onToggleSidebar: () => void;
}

export function Toolbar({ onToggleMenu, onToggleSidebar }: Props) {
  const { tabs, activeTabId, isPrivate, back, forward, reload, stop, navigate, newTab, setActive, closeTab, zoomIn } = useTabsStore();
  const { blockedCount } = useStatsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [addressValue, setAddressValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tabStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab && !editing) {
      setAddressValue(activeTab.url === "veil://newtab" ? "" : activeTab.url);
      checkBookmark(activeTab.url);
    }
  }, [activeTab?.url, editing]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!activeTabId || !tabStripRef.current) return;
    const activeEl = tabStripRef.current.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [activeTabId]);

  const checkBookmark = async (url: string) => {
    if (!url || url.startsWith("veil://")) { setBookmarked(false); return; }
    try {
      const list = await window.veil.bookmarks.list();
      setBookmarked(list.some((b) => b.url === url));
    } catch { setBookmarked(false); }
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressValue.trim()) {
      navigate(addressValue);
      inputRef.current?.blur();
      setEditing(false);
    }
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

  const handleMenuClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onToggleMenu({ x: rect.right, y: rect.bottom + 4 });
  };

  const isSecure = activeTab?.url.startsWith("https://") || activeTab?.url.startsWith("veil://");
  const isInternal = activeTab?.url.startsWith("veil://");
  const isLoading = activeTab?.isLoading;

  const isDarwin = window.veil.platform === "darwin";

  // Tab close with middle-click support
  const handleTabMouseDown = useCallback((e: React.MouseEvent, tabId: number) => {
    if (e.button === 1) { // middle click
      e.preventDefault();
      closeTab(tabId);
    }
  }, [closeTab]);

  return (
    <div className="flex flex-col flex-shrink-0" style={{ background: isPrivate ? "#1a0d20" : "var(--veil-toolbar)" }}>
      {/* ============ Row 1: Tab strip + Window controls ============ */}
      <div
        className="flex items-stretch h-9 select-none"
        style={{ WebkitAppRegion: "drag" } as any}
      >
        {/* Left: logo / app icon area (non-darwin) */}
        {!isDarwin && (
          <div className="flex items-center pl-2 pr-1" style={{ WebkitAppRegion: "no-drag" } as any}>
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                background: isPrivate
                  ? "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)"
                  : "linear-gradient(135deg, #4f9eff 0%, #2563eb 100%)",
              }}
            >
              <Shield size={11} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div
          ref={tabStripRef}
          className="flex items-end flex-1 overflow-x-auto overflow-y-hidden gap-0 px-1"
          style={{ WebkitAppRegion: "no-drag", scrollbarWidth: "none" } as any}
        >
          <style>{`.tab-strip::-webkit-scrollbar{display:none}`}</style>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => setActive(tab.id)}
                onMouseDown={(e) => handleTabMouseDown(e, tab.id)}
                className={`tab-chrome group ${isActive ? "active" : ""}`}
                style={isActive ? { ["--veil-tab-active" as any]: isPrivate ? "#a855f7" : "#4f9eff" } : {}}
                title={tab.title || tab.url}
              >
                {/* Favicon / loading indicator */}
                <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                  {tab.isLoading ? (
                    <RotateCw size={13} className="spin text-veil-accent" />
                  ) : tab.favicon ? (
                    <img src={tab.favicon} alt="" className="w-4 h-4 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <Globe size={13} className="text-veil-500" />
                  )}
                </div>
                {/* Title */}
                <span className="flex-1 truncate text-[13px] leading-none">
                  {tab.title || (tab.url === "veil://newtab" ? "New Tab" : tab.url) || "New Tab"}
                </span>
                {/* Close button */}
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-veil-700 transition-all"
                  title="Close tab"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
          {/* New tab button */}
          <button
            onClick={() => newTab()}
            className="flex-shrink-0 w-8 h-8 my-auto rounded-full flex items-center justify-center text-veil-400 hover:text-veil-100 hover:bg-veil-800 transition-colors"
            title="New Tab (Ctrl+T)"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Right: Window controls (non-darwin) */}
        {!isDarwin && (
          <div className="flex items-stretch" style={{ WebkitAppRegion: "no-drag" } as any}>
            <button
              onClick={minimizeWindow}
              className="w-12 flex items-center justify-center text-veil-400 hover:bg-veil-800 hover:text-veil-100 transition-colors"
              title="Minimize"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={toggleMaximize}
              className="w-12 flex items-center justify-center text-veil-400 hover:bg-veil-800 hover:text-veil-100 transition-colors"
              title="Maximize"
            >
              <Square size={12} />
            </button>
            <button
              onClick={closeWindow}
              className="w-12 flex items-center justify-center text-veil-400 hover:bg-red-600 hover:text-white transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ============ Row 2: Navigation + Address bar ============ */}
      <div
        className="flex items-center gap-1 px-2 h-11"
        style={{ background: isPrivate ? "#1a0d20" : "var(--veil-bg)" }}
      >
        {/* Sidebar toggle */}
        <button className="btn-icon-sm" onClick={onToggleSidebar} title="Toggle Sidebar">
          <PanelLeft size={17} />
        </button>
        <div className="divider-v" />

        {/* Back / Forward / Reload */}
        <button
          className="btn-icon-sm disabled:opacity-30 disabled:hover:bg-transparent"
          onClick={back}
          disabled={!activeTab?.canGoBack}
          title="Back (Alt+Left)"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          className="btn-icon-sm disabled:opacity-30 disabled:hover:bg-transparent"
          onClick={forward}
          disabled={!activeTab?.canGoForward}
          title="Forward (Alt+Right)"
        >
          <ArrowRight size={18} />
        </button>
        <button
          className="btn-icon-sm"
          onClick={() => (isLoading ? stop() : reload())}
          title={isLoading ? "Stop" : "Reload (Ctrl+R)"}
        >
          {isLoading ? <X size={17} /> : <RotateCw size={16} />}
        </button>

        {/* Address bar — centered, pill-shaped */}
        <form onSubmit={handleNavigate} className="flex-1 mx-2 relative max-w-3xl self-center w-full">
          <div
            className={`flex items-center gap-2 h-9 px-3 rounded-full border transition-all ${
              editing
                ? "border-veil-accent bg-veil-850 ring-2 ring-veil-accent/20"
                : "border-transparent bg-veil-880 hover:bg-veil-850"
            }`}
          >
            {/* Security indicator */}
            <div className="flex-shrink-0">
              {isInternal ? (
                <Shield size={15} className="text-veil-accent" />
              ) : isSecure ? (
                <Lock size={14} className="text-veil-success" />
              ) : (
                <Search size={15} className="text-veil-400" />
              )}
            </div>

            {/* URL / search input */}
            <input
              ref={inputRef}
              value={addressValue}
              onChange={(e) => setAddressValue(e.target.value)}
              onFocus={(e) => { setEditing(true); e.target.select(); }}
              onBlur={() => {
                setEditing(false);
                if (activeTab) setAddressValue(activeTab.url === "veil://newtab" ? "" : activeTab.url);
              }}
              placeholder="Search Veil or type a URL"
              className="flex-1 bg-transparent text-[13px] text-veil-100 placeholder-veil-500 focus:outline-none"
              spellCheck={false}
              autoComplete="off"
            />

            {/* Blocked counter badge */}
            {blockedCount > 0 && !editing && (
              <button
                type="button"
                className="flex-shrink-0 flex items-center gap-1 px-2 h-6 rounded-full bg-veil-800 hover:bg-veil-750 text-veil-300 hover:text-veil-100 transition-colors"
                title={`${blockedCount.toLocaleString()} trackers & ads blocked`}
              >
                <Shield size={11} className="text-veil-accent" />
                <span className="text-[11px] font-medium tabular-nums">{blockedCount > 999 ? `${(blockedCount/1000).toFixed(1)}k` : blockedCount}</span>
              </button>
            )}

            {/* Bookmark star */}
            {activeTab && !activeTab.url.startsWith("veil://") && (
              <button
                type="button"
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${bookmarked ? "text-veil-accent" : "text-veil-400 hover:text-veil-100 hover:bg-veil-800"}`}
                onClick={toggleBookmark}
                title="Bookmark (Ctrl+D)"
              >
                <Star size={14} fill={bookmarked ? "currentColor" : "none"} />
              </button>
            )}
          </div>

          {/* Loading progress bar */}
          {isLoading && (
            <div className="absolute -bottom-px left-3 right-3 h-px overflow-hidden rounded-full">
              <div className="h-full w-full shimmer-bar" />
            </div>
          )}
        </form>

        {/* Right side actions */}
        <button
          className="btn-icon-sm"
          onClick={() => window.dispatchEvent(new CustomEvent("veil:toggle-downloads"))}
          title="Downloads (Ctrl+J)"
        >
          <Download size={17} />
        </button>
        <button
          className="btn-icon-sm"
          onClick={() => { zoomIn(); }}
          title="Zoom in (Ctrl++)"
        >
          <ZoomIn size={17} />
        </button>
        <button
          className="btn-icon-sm"
          onClick={handleMenuClick}
          title="Menu"
        >
          <MoreVertical size={17} />
        </button>
      </div>
    </div>
  );
}

// Window control helpers — these call into the same IPC the TitleBar used
function minimizeWindow() {
  const wid = (window as any).__veilWindowId;
  if (wid) window.veil.windows.minimize(wid);
}
function toggleMaximize() {
  const wid = (window as any).__veilWindowId;
  if (wid) window.veil.windows.maximize(wid);
}
function closeWindow() {
  const wid = (window as any).__veilWindowId;
  if (wid) window.veil.windows.close(wid);
}
