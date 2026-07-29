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

// Shared style for all clickable elements — MUST have no-drag or clicks won't register
// on frameless windows
const NO_DRAG: React.CSSProperties = { WebkitAppRegion: "no-drag" } as any;

export function Toolbar({ onToggleMenu, onToggleSidebar }: Props) {
  const { tabs, activeTabId, isPrivate, windowId, back, forward, reload, stop, navigate, newTab, setActive, closeTab, zoomIn } = useTabsStore();
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

  useEffect(() => {
    if (!activeTabId || !tabStripRef.current) return;
    const activeEl = tabStripRef.current.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement;
    if (activeEl) activeEl.scrollIntoView({ block: "nearest", inline: "nearest" });
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

  const handleTabMouseDown = useCallback((e: React.MouseEvent, tabId: number) => {
    if (e.button === 1) { e.preventDefault(); closeTab(tabId); }
  }, [closeTab]);

  // Window control handlers — use store's windowId directly
  const doMinimize = () => { if (windowId !== null) window.veil.windows.minimize(windowId); };
  const doMaximize = () => { if (windowId !== null) window.veil.windows.maximize(windowId); };
  const doClose = () => { if (windowId !== null) window.veil.windows.close(windowId); };

  const isSecure = activeTab?.url.startsWith("https://") || activeTab?.url.startsWith("veil://");
  const isInternal = activeTab?.url.startsWith("veil://");
  const isLoading = activeTab?.isLoading;
  const isDarwin = window.veil.platform === "darwin";

  return (
    <div className="flex flex-col flex-shrink-0" style={{ background: isPrivate ? "#1a0d20" : "var(--veil-toolbar)" }}>
      {/* ============ Row 1: Tab strip + Window controls ============ */}
      <div
        className="flex items-stretch h-9 select-none"
        style={{ WebkitAppRegion: "drag" } as any}
      >
        {/* Left: logo */}
        {!isDarwin && (
          <div className="flex items-center pl-2 pr-1" style={NO_DRAG}>
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

        {/* Tabs — explicitly no-drag so all children are clickable */}
        <div
          ref={tabStripRef}
          className="flex items-end flex-1 overflow-x-auto overflow-y-hidden gap-0 px-1 tab-strip"
          style={NO_DRAG}
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
                style={isActive ? { ["--veil-tab-active" as any]: isPrivate ? "#a855f7" : "#4f9eff", ...NO_DRAG } : NO_DRAG}
                title={tab.title || tab.url}
              >
                {/* Favicon / loading */}
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
                {/* Close button — ALWAYS visible on active tab, hover on inactive */}
                <button
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); closeTab(tab.id); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center hover:bg-veil-700 transition-all ${
                    isActive ? "opacity-70" : "opacity-0 group-hover:opacity-60"
                  } hover:!opacity-100`}
                  title="Close tab"
                  style={NO_DRAG}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
          {/* New tab button */}
          <button
            onClick={() => newTab()}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-shrink-0 w-8 h-8 my-auto rounded-full flex items-center justify-center text-veil-400 hover:text-veil-100 hover:bg-veil-800 transition-colors"
            title="New Tab (Ctrl+T)"
            style={NO_DRAG}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Right: Window controls */}
        {!isDarwin && (
          <div className="flex items-stretch" style={NO_DRAG}>
            <button
              onClick={doMinimize}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-12 flex items-center justify-center text-veil-400 hover:bg-veil-800 hover:text-veil-100 transition-colors"
              title="Minimize"
              style={NO_DRAG}
            >
              <Minus size={16} />
            </button>
            <button
              onClick={doMaximize}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-12 flex items-center justify-center text-veil-400 hover:bg-veil-800 hover:text-veil-100 transition-colors"
              title="Maximize"
              style={NO_DRAG}
            >
              <Square size={12} />
            </button>
            <button
              onClick={doClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-12 flex items-center justify-center text-veil-400 hover:bg-red-600 hover:text-white transition-colors"
              title="Close"
              style={NO_DRAG}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ============ Row 2: Navigation + Address bar ============ */}
      <div
        className="flex items-center gap-1 px-2 h-11"
        style={{ background: isPrivate ? "#1a0d20" : "var(--veil-bg)", ...NO_DRAG }}
      >
        {/* Sidebar toggle */}
        <button
          className="btn-icon-sm"
          onClick={onToggleSidebar}
          onMouseDown={(e) => e.stopPropagation()}
          title="Toggle Sidebar"
          style={NO_DRAG}
        >
          <PanelLeft size={17} />
        </button>
        <div className="divider-v" />

        {/* Back / Forward / Reload */}
        <button
          className="btn-icon-sm disabled:opacity-30 disabled:hover:bg-transparent"
          onClick={back}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={!activeTab?.canGoBack}
          title="Back (Alt+Left)"
          style={NO_DRAG}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          className="btn-icon-sm disabled:opacity-30 disabled:hover:bg-transparent"
          onClick={forward}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={!activeTab?.canGoForward}
          title="Forward (Alt+Right)"
          style={NO_DRAG}
        >
          <ArrowRight size={18} />
        </button>
        <button
          className="btn-icon-sm"
          onClick={() => (isLoading ? stop() : reload())}
          onMouseDown={(e) => e.stopPropagation()}
          title={isLoading ? "Stop" : "Reload (Ctrl+R)"}
          style={NO_DRAG}
        >
          {isLoading ? <X size={17} /> : <RotateCw size={16} />}
        </button>

        {/* Address bar */}
        <form onSubmit={handleNavigate} className="flex-1 mx-2 relative max-w-3xl self-center w-full" style={NO_DRAG}>
          <div
            className={`flex items-center gap-2 h-9 px-3 rounded-full border transition-all ${
              editing
                ? "border-veil-accent bg-veil-850 ring-2 ring-veil-accent/20"
                : "border-transparent bg-veil-880 hover:bg-veil-850"
            }`}
          >
            <div className="flex-shrink-0">
              {isInternal ? (
                <Shield size={15} className="text-veil-accent" />
              ) : isSecure ? (
                <Lock size={14} className="text-veil-success" />
              ) : (
                <Search size={15} className="text-veil-400" />
              )}
            </div>
            <input
              ref={inputRef}
              value={addressValue}
              onChange={(e) => setAddressValue(e.target.value)}
              onFocus={(e) => { setEditing(true); e.target.select(); }}
              onBlur={() => {
                setEditing(false);
                if (activeTab) setAddressValue(activeTab.url === "veil://newtab" ? "" : activeTab.url);
              }}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search Veil or type a URL"
              className="flex-1 bg-transparent text-[13px] text-veil-100 placeholder-veil-500 focus:outline-none"
              spellCheck={false}
              autoComplete="off"
              style={NO_DRAG}
            />
            {blockedCount > 0 && !editing && (
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                className="flex-shrink-0 flex items-center gap-1 px-2 h-6 rounded-full bg-veil-800 hover:bg-veil-750 text-veil-300 hover:text-veil-100 transition-colors"
                title={`${blockedCount.toLocaleString()} trackers & ads blocked`}
                style={NO_DRAG}
              >
                <Shield size={11} className="text-veil-accent" />
                <span className="text-[11px] font-medium tabular-nums">{blockedCount > 999 ? `${(blockedCount/1000).toFixed(1)}k` : blockedCount}</span>
              </button>
            )}
            {activeTab && !activeTab.url.startsWith("veil://") && (
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${bookmarked ? "text-veil-accent" : "text-veil-400 hover:text-veil-100 hover:bg-veil-800"}`}
                onClick={toggleBookmark}
                title="Bookmark (Ctrl+D)"
                style={NO_DRAG}
              >
                <Star size={14} fill={bookmarked ? "currentColor" : "none"} />
              </button>
            )}
          </div>
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
          onMouseDown={(e) => e.stopPropagation()}
          title="Downloads (Ctrl+J)"
          style={NO_DRAG}
        >
          <Download size={17} />
        </button>
        <button
          className="btn-icon-sm"
          onClick={() => zoomIn()}
          onMouseDown={(e) => e.stopPropagation()}
          title="Zoom in (Ctrl++)"
          style={NO_DRAG}
        >
          <ZoomIn size={17} />
        </button>
        <button
          className="btn-icon-sm"
          onClick={handleMenuClick}
          onMouseDown={(e) => e.stopPropagation()}
          title="Menu"
          style={NO_DRAG}
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}
