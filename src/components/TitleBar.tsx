import { Minus, Square, X, Shield } from "lucide-react";

interface Props {
  onToggleSidebar: () => void;
  onToggleSettings: () => void;
}

export function TitleBar({ onToggleSidebar, onToggleSettings }: Props) {
  const minimize = () => window.veil.window.minimize();
  const maximize = () => window.veil.window.maximize();
  const close = () => window.veil.window.close();

  return (
    <div
      className="flex items-center justify-between h-10 bg-veil-900 border-b border-veil-800 select-none"
      style={{ WebkitAppRegion: "drag" } as any}
    >
      {/* Left: logo + window menu */}
      <div className="flex items-center gap-2 pl-3" style={{ WebkitAppRegion: "no-drag" } as any}>
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-veil-accent to-veil-accent2 flex items-center justify-center shadow-glow">
          <Shield size={14} className="text-veil-950" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-veil-200 tracking-tight">Veil</span>
        <span className="text-xs text-veil-500 ml-1">0.2.0</span>
      </div>

      {/* Center: spacer (drag area) */}
      <div className="flex-1" />

      {/* Right: window controls (Windows/Linux only — macOS uses native) */}
      {process.platform !== "darwin" && (
        <div className="flex items-center" style={{ WebkitAppRegion: "no-drag" } as any}>
          <button className="btn-icon-sm hover:bg-veil-700" onClick={minimize} title="Minimize">
            <Minus size={14} />
          </button>
          <button className="btn-icon-sm hover:bg-veil-700" onClick={maximize} title="Maximize">
            <Square size={12} />
          </button>
          <button
            className="inline-flex items-center justify-center w-7 h-7 hover:bg-red-600 text-veil-400 hover:text-white rounded-md transition-colors"
            onClick={close}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
