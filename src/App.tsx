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

  useEffect(() => {
    initTabs();
    initStats();
    initSettings();
  }, [initTabs, initStats, initSettings]);

  useEffect(() => {
    window.veil.on("find:toggle", () => setFindOpen((v) => !v));
    window.veil.on("downloads:toggle", () => setDownloadsOpen((v) => !v));
    window.veil.on("data:clear-dialog", () => setClearDataOpen(true));
    const handler = () => setClearDataOpen(true);
    const dlHandler = () => setDownloadsOpen((v) => !v);
    window.addEventListener("veil:clear-data", handler);
    window.addEventListener("veil:toggle-downloads", dlHandler);
    return () => {
      window.removeEventListener("veil:clear-data", handler);
      window.removeEventListener("veil:toggle-downloads", dlHandler);
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
        {/* WebContentsView is rendered here by Electron main process (transparent area) */}
        <div className="flex-1" style={{ background: "transparent" }} />
      </div>

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
