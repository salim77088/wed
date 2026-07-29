import { useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { useTabsStore } from "../stores/tabs";

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TitleBar({ sidebarOpen: _sidebarOpen, onToggleSidebar: _onToggleSidebar }: Props) {
  const [maximized, setMaximized] = useState(false);
  const { windowId, isPrivate } = useTabsStore();

  useEffect(() => {
    if (windowId === null) return;
    window.veil.windows.isMaximized(windowId).then(setMaximized);
    const handler = () => window.veil.windows.isMaximized(windowId).then(setMaximized);
    window.veil.on("window:state", handler);
    const interval = setInterval(() => {
      if (windowId !== null) window.veil.windows.isMaximized(windowId).then(setMaximized);
    }, 800);
    return () => clearInterval(interval);
  }, [windowId]);

  const minimize = () => windowId !== null && window.veil.windows.minimize(windowId);
  const toggleMax = () => windowId !== null && window.veil.windows.maximize(windowId);
  const close = () => windowId !== null && window.veil.windows.close(windowId);

  // On Windows/Linux, title bar is integrated into tab strip (handled in Toolbar).
  // On macOS, native traffic lights are shown by the OS.
  // This TitleBar component is now a no-op on Windows/Linux (returns null),
  // and on macOS returns a minimal drag region.
  if (window.veil.platform !== "darwin") {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between h-7 select-none flex-shrink-0"
      style={{
        background: isPrivate ? "#1a0d20" : "var(--veil-toolbar)",
        WebkitAppRegion: "drag",
      } as any}
    >
      <div className="flex items-center gap-2 pl-3" style={{ WebkitAppRegion: "no-drag" } as any}>
        <span className="text-xs font-medium text-veil-300">
          {isPrivate ? "Veil — Private" : "Veil"}
        </span>
      </div>
      <div className="flex-1" />
      {/* macOS uses native traffic lights, no buttons here */}
    </div>
  );
}
