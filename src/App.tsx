import { useEffect, useState } from "react";
import { TitleBar } from "./components/TitleBar";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { SettingsPanel } from "./components/SettingsPanel";
import { useTabsStore } from "./stores/tabs";
import { useStatsStore } from "./stores/stats";
import { useSettingsStore } from "./stores/settings";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const initTabs = useTabsStore((s) => s.init);
  const initStats = useStatsStore((s) => s.init);
  const initSettings = useSettingsStore((s) => s.init);

  useEffect(() => {
    initTabs();
    initStats();
    initSettings();
  }, [initTabs, initStats, initSettings]);

  return (
    <div className="flex flex-col h-screen w-screen bg-veil-950 text-veil-100">
      {/* macOS-style title bar / Windows custom title bar */}
      <TitleBar onToggleSidebar={() => setSidebarOpen((v) => !v)} onToggleSettings={() => setSettingsOpen((v) => !v)} />

      {/* Toolbar with address bar */}
      <Toolbar />

      {/* Main area: sidebar + content (content is rendered by Electron's contentView behind) */}
      <div className="flex-1 flex overflow-hidden relative">
        {sidebarOpen && <Sidebar onOpenSettings={() => setSettingsOpen(true)} />}
        {/* The Electron webContentsView for the active tab renders here in the background.
            We just leave space for it. */}
        <div className="flex-1" style={{ background: "transparent" }} />
      </div>

      {/* Settings overlay panel */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
