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
    <div className="flex flex-col h-screen w-screen text-veil-100" style={{ background: "transparent" }}>
      {/* macOS-style title bar / Windows custom title bar */}
      <TitleBar onToggleSidebar={() => setSidebarOpen((v) => !v)} onToggleSettings={() => setSettingsOpen((v) => !v)} />

      {/* Toolbar with address bar */}
      <Toolbar />

      {/* Main area: sidebar + content.
          The actual web content is rendered by Electron's WebContentsView,
          which lives BEHIND this React layer. The container below is transparent
          so the webview shows through. The sidebar floats on top of the webview. */}
      <div className="flex-1 flex overflow-hidden relative" style={{ background: "transparent" }}>
        {sidebarOpen && <Sidebar onOpenSettings={() => setSettingsOpen(true)} />}
        {/* Transparent spacer — webview shows through here */}
        <div className="flex-1" style={{ background: "transparent" }} />
      </div>

      {/* Settings overlay panel */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
