import { useState } from "react";
import { Trash2, X, Check } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function ClearDataDialog({ onClose }: Props) {
  const [opts, setOpts] = useState({
    history: true,
    cache: true,
    cookies: false,
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
    downloads: false,
  });
  const [clearing, setClearing] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (key: keyof typeof opts) => {
    setOpts((o) => ({ ...o, [key]: !o[key] }));
  };

  const handleClear = async () => {
    setClearing(true);
    await window.veil.data.clear(opts);
    setClearing(false);
    setDone(true);
    setTimeout(onClose, 1500);
  };

  const items: { key: keyof typeof opts; label: string; desc: string }[] = [
    { key: "history", label: "Browsing History", desc: "URLs and titles of visited pages" },
    { key: "cache", label: "Cached Images & Files", desc: "Temporary files stored on disk" },
    { key: "cookies", label: "Cookies", desc: "Site login sessions and preferences" },
    { key: "localStorage", label: "Local Storage", desc: "Site data stored in browser" },
    { key: "sessionStorage", label: "Session Storage", desc: "Tab-session-only data" },
    { key: "indexedDB", label: "IndexedDB", desc: "Offline app data" },
    { key: "downloads", label: "Download History", desc: "List of downloaded files (files remain on disk)" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[500px] max-h-[80vh] bg-veil-900 border border-veil-700 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-veil-800">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-veil-danger" />
            <h2 className="text-base font-semibold">Clear Browsing Data</h2>
          </div>
          <button onClick={onClose} className="btn-icon-sm">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {items.map((item) => (
            <label
              key={item.key}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-veil-850 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={opts[item.key]}
                onChange={() => toggle(item.key)}
                className="mt-1 accent-veil-accent w-4 h-4"
              />
              <div>
                <div className="text-sm text-veil-100">{item.label}</div>
                <div className="text-xs text-veil-500">{item.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-veil-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-veil-300 hover:bg-veil-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleClear}
            disabled={clearing || done || !Object.values(opts).some(Boolean)}
            className="px-4 py-2 text-sm rounded-lg bg-veil-danger text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {clearing ? (
              <>Clearing...</>
            ) : done ? (
              <><Check size={14} /> Done</>
            ) : (
              <>Clear Data</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
