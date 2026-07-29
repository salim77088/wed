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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
    window.addEventListener("veil:clear-data", handler);
    return () => window.removeEventListener("veil:clear-data", handler);
  }, []);

  return (
    <div
      className="flex flex-col h-screen w-screen text-veil-100"
      style={{ background: isPrivate ? "linear-gradient(180deg, #1a0d20 0%, #0a0d12 100%)" : "transparent" }}
    >
      <TitleBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <Toolbar
        onToggleMenu={() => setMenuOpen(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex-1 flex overflow-hidden relative" style={{ background: "transparent" }}>
        {sidebarOpen && <Sidebar onOpenSettings={() => setSettingsOpen(true)} />}
        <div className="flex-1" style={{ background: "transparent" }} />
      </div>

      {/* Find in page bar */}
      {findOpen && <FindBar onClose={() => setFindOpen(false)} />}

      {/* Downloads panel */}
      {downloadsOpen && <DownloadsPanel onClose={() => setDownloadsOpen(false)} />}

      {/* Hamburger menu */}
      {menuOpen && (
        <HamburgerMenu
          onClose={() => setMenuOpen(false)}
          onOpenSettings={() => {
            setMenuOpen(false);
            setSettingsOpen(true);
          }}
        />
      )}

      {/* Settings overlay */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {/* Clear data dialog */}
      {clearDataOpen && <ClearDataDialog onClose={() => setClearDataOpen(false)} />}
    </div>
  );
}
