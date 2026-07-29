import { useEffect, useRef } from "react";
import {
  Plus, AppWindow, Eye, Network, PanelLeft, KeyRound, History, Star,
  Download, Puzzle, Trash2, ZoomIn, ZoomOut, Printer, Search, Save, Share2,
  Wrench, HelpCircle, Settings, Power, Globe,
} from "lucide-react";
import { useTabsStore } from "../stores/tabs";

interface Props {
  position?: { x: number; y: number };
  onClose: () => void;
  onOpenSettings: () => void;
  onFind?: () => void;
  onDownloads?: () => void;
}

export function HamburgerMenu({ position, onClose, onOpenSettings, onFind, onDownloads }: Props) {
  const { newTab } = useTabsStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [onClose]);

  const action = (fn: () => void) => {
    onClose();
    fn();
  };

  // Compute position — anchor to top-right by default, adjust if near edge
  const pos = position || { x: window.innerWidth - 20, y: 80 };
  const menuWidth = 280;
  const menuLeft = Math.min(pos.x - menuWidth, window.innerWidth - menuWidth - 12);
  const menuTop = Math.min(pos.y + 4, window.innerHeight - 400);

  const menuItem = (icon: React.ReactNode, label: string, shortcut: string, fn: () => void, accent = false) => (
    <button
      onClick={() => action(fn)}
      className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] transition-colors text-left rounded-md ${
        accent ? "text-veil-accent hover:bg-veil-800" : "text-veil-200 hover:bg-veil-800"
      }`}
    >
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-veil-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-[11px] text-veil-500 tabular-nums">{shortcut}</span>}
    </button>
  );

  const sectionLabel = (label: string) => (
    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-veil-500 font-semibold">{label}</div>
  );

  const divider = () => <div className="h-px bg-veil-700 mx-2 my-1" />;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={ref}
        className="absolute w-72 max-h-[calc(100vh-100px)] overflow-y-auto bg-veil-900 border border-veil-700 rounded-xl shadow-lg pointer-events-auto animate-slide-down"
        style={{
          left: menuLeft,
          top: menuTop,
          background: "rgba(20, 21, 24, 0.98)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* New Tab / Window section */}
        {sectionLabel("New")}
        <div className="px-1.5">
          {menuItem(<Plus size={15} />, "New Tab", "Ctrl+T", () => newTab())}
          {menuItem(<AppWindow size={15} />, "New Window", "Ctrl+N", () => window.veil.windows.new(false))}
          {menuItem(<Eye size={15} />, "New Private Window", "Ctrl+Shift+N", () => window.veil.windows.new(true), true)}
          {menuItem(<Network size={15} />, "New Tor Window", "", () => window.veil.windows.new(true), true)}
        </div>

        {divider()}
        {/* History & Bookmarks */}
        <div className="px-1.5">
          {menuItem(<History size={15} />, "History", "Ctrl+H", () => newTab("veil://history"))}
          {menuItem(<Star size={15} />, "Bookmarks", "", () => newTab("veil://bookmarks"))}
          {menuItem(<Download size={15} />, "Downloads", "Ctrl+J", () => onDownloads ? onDownloads() : window.dispatchEvent(new CustomEvent("veil:toggle-downloads")))}
          {menuItem(<KeyRound size={15} />, "Passwords", "", () => newTab("veil://settings#passwords"))}
          {menuItem(<Puzzle size={15} />, "Extensions", "", () => newTab("veil://extensions"))}
        </div>

        {divider()}
        {/* Page tools */}
        <div className="px-1.5">
          {menuItem(<ZoomIn size={15} />, "Zoom In", "Ctrl++", () => useTabsStore.getState().zoomIn())}
          {menuItem(<ZoomOut size={15} />, "Zoom Out", "Ctrl+-", () => useTabsStore.getState().zoomOut())}
          {menuItem(<Printer size={15} />, "Print", "Ctrl+P", () => useTabsStore.getState().print())}
          {menuItem(<Search size={15} />, "Find in Page", "Ctrl+F", () => onFind ? onFind() : window.dispatchEvent(new CustomEvent("veil:toggle-find")))}
          {menuItem(<Save size={15} />, "Save Page As", "Ctrl+S", () => useTabsStore.getState().savePage())}
          {menuItem(<Share2 size={15} />, "Copy Link", "", () => useTabsStore.getState().share())}
          {menuItem(<Wrench size={15} />, "Developer Tools", "F12", () => useTabsStore.getState().devtools())}
        </div>

        {divider()}
        {/* Privacy / Data */}
        <div className="px-1.5">
          {menuItem(<PanelLeft size={15} />, "Toggle Sidebar", "", () => window.dispatchEvent(new CustomEvent("veil:toggle-sidebar")))}
          {menuItem(<Trash2 size={15} />, "Clear Browsing Data", "Ctrl+Shift+Del", () => window.dispatchEvent(new CustomEvent("veil:clear-data")), true)}
        </div>

        {divider()}
        {/* App */}
        <div className="px-1.5 pb-1.5">
          {menuItem(<HelpCircle size={15} />, "Help & About", "", () => newTab("veil://settings#about"))}
          {menuItem(<Settings size={15} />, "Settings", "", onOpenSettings)}
          {menuItem(<Power size={15} />, "Exit Veil", "", () => window.veil.app.quit(), true)}
        </div>
      </div>
    </div>
  );
}
