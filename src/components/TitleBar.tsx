import { useEffect, useState } from "react";
import { Minus, Square, X, Shield, Lock } from "lucide-react";
import { useTabsStore } from "../stores/tabs";

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TitleBar({ sidebarOpen, onToggleSidebar }: Props) {
  const [maximized, setMaximized] = useState(false);
  const { windowId, isPrivate } = useTabsStore();

  useEffect(() => {
    if (windowId === null) return;
    window.veil.windows.isMaximized(windowId).then(setMaximized);
    const interval = setInterval(() => {
      if (windowId !== null) window.veil.windows.isMaximized(windowId).then(setMaximized);
    }, 500);
    return () => clearInterval(interval);
  }, [windowId]);

  const minimize = () => windowId !== null && window.veil.windows.minimize(windowId);
  const maximize = () => windowId !== null && window.veil.windows.maximize(windowId);
  const close = () => windowId !== null && window.veil.windows.close(windowId);

  return (
    <div
      className="flex items-center justify-between h-10 border-b select-none"
      style={{
        background: isPrivate ? "rgba(26, 13, 32, 0.95)" : "rgba(15, 19, 26, 0.95)",
        borderColor: isPrivate ? "rgba(124, 92, 255, 0.2)" : "rgba(37, 45, 63, 0.5)",
        WebkitAppRegion: "drag",
      } as any}
    >
      {/* Left: logo + window name */}
      <div className="flex items-center gap-2 pl-3" style={{ WebkitAppRegion: "no-drag" } as any}>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{
            background: isPrivate
              ? "linear-gradient(135deg, #7c5cff 0%, #ef4444 100%)"
              : "linear-gradient(135deg, #00d9ff 0%, #7c5cff 100%)",
            boxShadow: "0 0 20px -4px rgba(0, 217, 255, 0.4)",
          }}
        >
          {isPrivate ? <Lock size={12} className="text-white" strokeWidth={2.5} /> : <Shield size={12} className="text-veil-950" strokeWidth={2.5} />}
        </div>
        <span className="text-sm font-semibold text-veil-200 tracking-tight">Veil</span>
        <span className="text-xs text-veil-500">0.3.0</span>
        {isPrivate && (
          <span className="ml-2 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-veil-accent2/20 text-veil-accent2 font-medium">
            Private
          </span>
        )}
      </div>

      <div className="flex-1" />

      {window.veil.platform !== "darwin" && (
        <div className="flex items-center" style={{ WebkitAppRegion: "no-drag" } as any}>
          <button
            onClick={minimize}
            className="inline-flex items-center justify-center w-12 h-10 text-veil-400 hover:bg-veil-800 hover:text-veil-100 transition-colors"
            title="Minimize"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={maximize}
            className="inline-flex items-center justify-center w-12 h-10 text-veil-400 hover:bg-veil-800 hover:text-veil-100 transition-colors"
            title="Maximize"
          >
            <Square size={12} />
          </button>
          <button
            onClick={close}
            className="inline-flex items-center justify-center w-12 h-10 text-veil-400 hover:bg-red-600 hover:text-white transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
