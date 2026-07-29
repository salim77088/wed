import { useEffect, useRef } from "react";
import {
  Plus, AppWindow, Eye, Network, PanelLeft, KeyRound, History, Star,
  Download, Puzzle, Trash2, ZoomIn, ZoomOut, Printer, Search, Save, Share2,
  Wrench, HelpCircle, Settings, Power,
} from "lucide-react";
import { useTabsStore } from "../stores/tabs";

interface Props {
  onClose: () => void;
  onOpenSettings: () => void;
}

export function HamburgerMenu({ onClose, onOpenSettings }: Props) {
  const { newTab } = useTabsStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const action = (fn: () => void) => {
    onClose();
    fn();
  };

  const menuItem = (icon: React.ReactNode, label: string, shortcut: string, fn: () => void, accent = false) => (
    <button
      onClick={() => action(fn)}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left ${
        accent ? "text-veil-accent hover:bg-veil-800" : "text-veil-200 hover:bg-veil-800"
      }`}
    >
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-xs text-veil-500">{shortcut}</span>}
    </button>
  );

  const sectionLabel = (label: string) => (
    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-veil-500 font-semibold">{label}</div>
  );

  const divider = () => <div className="h-px bg-veil-800 mx-2 my-1" />;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={ref}
        className="absolute top-[112px] right-3 w-72 max-h-[calc(100vh-130px)] overflow-y-auto bg-veil-900 border border-veil-700 rounded-xl shadow-2xl pointer-events-auto"
        style={{ background: "rgba(15, 19, 26, 0.98)", backdropFilter: "blur(20px)" }}
      >
        {/* 🌐 Browse & Windows */}
        {sectionLabel("🌐 Browse & Windows")}
        {menuItem(<Plus size={14} />, "New Tab", "Ctrl+T", () => newTab())}
        {menuItem(<AppWindow size={14} />, "New Window", "Ctrl+N", () => window.veil.windows.new(false))}
        {menuItem(<Eye size={14} />, "New Private Window", "Ctrl+Shift+N", () => window.veil.windows.new(true), true)}
        {menuItem(<Network size={14} />, "Private Window with Tor", "", () => window.veil.windows.new(true), true)}

        {divider()}
        {/* ⚙️ Manage Data */}
        {sectionLabel("⚙️ Manage Data")}
        {menuItem(<PanelLeft size={14} />, "Sidebar", "", () => window.dispatchEvent(new CustomEvent("veil:toggle-sidebar")))}
        {menuItem(<KeyRound size={14} />, "Passwords & Autofill", "", () => newTab("veil://settings#passwords"))}
        {menuItem(<History size={14} />, "History", "Ctrl+H", () => newTab("veil://history"))}
        {menuItem(<Star size={14} />, "Bookmarks & Lists", "", () => newTab("veil://bookmarks"))}
        {menuItem(<Download size={14} />, "Downloads", "Ctrl+J", () => window.dispatchEvent(new CustomEvent("veil:toggle-downloads")))}
        {menuItem(<Puzzle size={14} />, "Extensions", "", () => newTab("veil://extensions"))}
        {menuItem(<Trash2 size={14} />, "Delete Browsing Data", "Ctrl+Shift+Del", () => window.dispatchEvent(new CustomEvent("veil:clear-data")), true)}

        {divider()}
        {/* 🔍 Tools */}
        {sectionLabel("🔍 Tools")}
        {menuItem(<ZoomIn size={14} />, "Zoom In", "Ctrl++", () => useTabsStore.getState().zoomIn())}
        {menuItem(<ZoomOut size={14} />, "Zoom Out", "Ctrl+-", () => useTabsStore.getState().zoomOut())}
        {menuItem(<Printer size={14} />, "Print", "Ctrl+P", () => useTabsStore.getState().print())}
        {menuItem(<Search size={14} />, "Find in Page", "Ctrl+F", () => window.dispatchEvent(new CustomEvent("veil:toggle-find")))}
        {menuItem(<Save size={14} />, "Save Page As", "Ctrl+S", () => useTabsStore.getState().savePage())}
        {menuItem(<Share2 size={14} />, "Share / Copy URL", "", () => useTabsStore.getState().share())}
        {menuItem(<Wrench size={14} />, "More Tools (DevTools)", "F12", () => useTabsStore.getState().devtools())}

        {divider()}
        {/* ⚙️ Options */}
        {sectionLabel("⚙️ Options")}
        {menuItem(<HelpCircle size={14} />, "Help & About", "", () => newTab("veil://settings#about"))}
        {menuItem(<Settings size={14} />, "Settings", "", onOpenSettings)}
        {menuItem(<Power size={14} />, "Exit Veil", "", () => window.veil.app.quit(), true)}
      </div>
    </div>
  );
}
