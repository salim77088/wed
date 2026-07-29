import { useEffect, useState } from "react";
import { TitleBar } from "./components/TitleBar";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { SettingsPanel } from "./components/SettingsPanel";
import { HamburgerMenu } from "./components/HamburgerMenu";
import { FindBar } from "./components/FindBar";
import { DownloadsPanel } from "./components/DownloadsPanel";
import { ClearDataDialog } from "./components/ClearDataDialog";
import { useTabsStore } from "./stores/tabs";
import { useStatsStore } from "./stores/stats";
import { useSettingsStore } from "./stores/settings";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [findOpen, setFindOpen] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);

  const initTabs = useTabsStore((s) => s.init);
  const initStats = useStatsStore((s) => s.init);
  const initSettings = useSettingsStore((s) => s.init);
  const isPrivate = useTabsStore((s) => s.isPrivate);
  const windowId = useTabsStore((s) => s.windowId);

  useEffect(() => {
    initTabs();
    initStats();
    initSettings();
  }, [initTabs, initStats, initSettings]);

  useEffect(() => {
    // IPC events from main process
    window.veil.on("find:toggle", () => setFindOpen((v) => !v));
    window.veil.on("downloads:toggle", () => setDownloadsOpen((v) => !v));
    window.veil.on("data:clear-dialog", () => setClearDataOpen(true));

    // Custom events from other components
    const clearHandler = () => setClearDataOpen(true);
    const dlHandler = () => setDownloadsOpen((v) => !v);
    const sidebarHandler = () => setSidebarOpen((v) => !v);
    const findHandler = () => setFindOpen((v) => !v);
    window.addEventListener("veil:clear-data", clearHandler);
    window.addEventListener("veil:toggle-downloads", dlHandler);
    window.addEventListener("veil:toggle-sidebar", sidebarHandler);
    window.addEventListener("veil:toggle-find", findHandler);
    return () => {
      window.removeEventListener("veil:clear-data", clearHandler);
      window.removeEventListener("veil:toggle-downloads", dlHandler);
      window.removeEventListener("veil:toggle-sidebar", sidebarHandler);
      window.removeEventListener("veil:toggle-find", findHandler);
    };
  }, []);

  return (
    <div
      className="flex flex-col h-screen w-screen text-veil-100 overflow-hidden"
      style={{ background: isPrivate ? "linear-gradient(180deg, #1a0d20 0%, #141518 100%)" : "var(--veil-bg)" }}
    >
      <TitleBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <Toolbar
        onToggleMenu={(pos?: any) => {
          if (pos) setMenuPosition(pos);
          setMenuOpen(true);
        }}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {sidebarOpen && <Sidebar onOpenSettings={() => setSettingsOpen(true)} />}
        {/* WebContentsView is rendered here by Electron (transparent area) */}
        <div className="flex-1" style={{ background: "transparent" }} />
      </div>

      {/* Loading indicator until windowId is set */}
      {!windowId && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-veil-500 text-sm">Loading Veil...</div>
        </div>
      )}

      {/* Find in page bar */}
      {findOpen && <FindBar onClose={() => setFindOpen(false)} />}

      {/* Downloads panel */}
      {downloadsOpen && <DownloadsPanel onClose={() => setDownloadsOpen(false)} />}

      {/* Hamburger menu */}
      {menuOpen && (
        <HamburgerMenu
          position={menuPosition}
          onClose={() => setMenuOpen(false)}
          onOpenSettings={() => { setMenuOpen(false); setSettingsOpen(true); }}
          onFind={() => { setMenuOpen(false); setFindOpen(true); }}
          onDownloads={() => { setMenuOpen(false); setDownloadsOpen(true); }}
        />
      )}

      {/* Settings overlay */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {/* Clear data dialog */}
      {clearDataOpen && <ClearDataDialog onClose={() => setClearDataOpen(false)} />}
    </div>
  );
}
