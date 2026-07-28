import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Plus,
  Lock,
  Shield,
  Search,
  Star,
  Settings as SettingsIcon,
  PanelLeft,
} from "lucide-react";
import { useTabsStore } from "../stores/tabs";
import { useStatsStore } from "../stores/stats";

interface Props {
  onToggleSidebar?: () => void;
  onToggleSettings?: () => void;
}

export function Toolbar({ onToggleSidebar, onToggleSettings }: Props) {
  const { tabs, activeTabId, back, forward, reload, stop, navigate, newTab, setActive, closeTab } =
    useTabsStore();
  const { blockedCount } = useStatsStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [addressValue, setAddressValue] = useState("");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab && !editing) {
      setAddressValue(activeTab.url);
    }
  }, [activeTab?.url, editing]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressValue.trim()) {
      navigate(addressValue);
    }
    inputRef.current?.blur();
    setEditing(false);
  };

  const isSecure = activeTab?.url.startsWith("https://") || activeTab?.url.startsWith("veil://");
  const isInternal = activeTab?.url.startsWith("veil://");

  return (
    <div className="flex flex-col bg-veil-900 border-b border-veil-800">
      {/* Tab strip */}
      <div className="flex items-center gap-1 px-2 h-10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`group flex items-center gap-2 px-3 h-8 rounded-lg cursor-pointer transition-all duration-150 text-sm min-w-[120px] max-w-[200px] ${
              tab.id === activeTabId
                ? "bg-veil-700 text-veil-100 shadow-glow"
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
            <span className="flex-1 truncate text-left">
              {tab.title || tab.url || "New Tab"}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-veil-600 rounded p-0.5 flex-shrink-0"
            >
              <X size={12} />
            </span>
          </button>
        ))}
        <button
          onClick={() => newTab()}
          className="btn-icon-sm flex-shrink-0"
          title="New Tab (Ctrl+T)"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Navigation + address bar */}
      <div className="flex items-center gap-2 px-3 h-12">
        {onToggleSidebar && (
          <button className="btn-icon-sm" onClick={onToggleSidebar} title="Toggle Sidebar">
            <PanelLeft size={16} />
          </button>
        )}
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
              onFocus={(e) => {
                setEditing(true);
                e.target.select();
              }}
              onBlur={() => setEditing(false)}
              placeholder="Search or type a URL"
              className="flex-1 bg-transparent text-sm text-veil-100 placeholder-veil-500 focus:outline-none"
              spellCheck={false}
            />
            <button
              type="button"
              className="text-xs px-2 py-0.5 rounded-full bg-veil-700 text-veil-accent font-medium flex-shrink-0"
              title="Items blocked this session"
            >
              {blockedCount > 0 ? `${blockedCount} blocked` : "0 blocked"}
            </button>
          </div>
        </form>

        <button className="btn-icon-sm" title="Bookmark this page">
          <Star size={16} />
        </button>
        {onToggleSettings && (
          <button className="btn-icon-sm" onClick={onToggleSettings} title="Settings">
            <SettingsIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
