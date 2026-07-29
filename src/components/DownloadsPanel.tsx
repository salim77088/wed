import { useEffect, useState } from "react";
import { Download, X, FileText, Check, Loader2, FolderOpen, Trash2 } from "lucide-react";

interface Props {
  onClose: () => void;
}

interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  savePath: string;
  totalBytes: number;
  receivedBytes: number;
  state: string;
  startTime: number;
  endTime?: number;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function DownloadsPanel({ onClose }: Props) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  useEffect(() => {
    window.veil.downloads.list().then(setDownloads);
    window.veil.downloads.onUpdated(setDownloads);
  }, []);

  return (
    <div className="absolute top-[84px] right-4 z-40 w-[480px] max-h-[60vh] bg-veil-900 border border-veil-700 rounded-xl shadow-lg flex flex-col animate-slide-down"
      style={{ background: "rgba(20, 21, 24, 0.98)", backdropFilter: "blur(20px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-veil-800">
        <div className="flex items-center gap-2">
          <Download size={14} className="text-veil-accent" />
          <span className="text-sm font-semibold text-veil-100">Downloads</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="btn-icon-sm"
            onClick={async () => { await window.veil.downloads.clear(); setDownloads([]); }}
            title="Clear list"
          >
            <Trash2 size={14} />
          </button>
          <button className="btn-icon-sm" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-veil-500">
            <Download size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No downloads yet</p>
          </div>
        ) : (
          downloads.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-veil-800 transition-colors cursor-pointer"
              onClick={() => window.veil.downloads.open(d.savePath)}
            >
              <div className="w-8 h-8 rounded-lg bg-veil-700 flex items-center justify-center flex-shrink-0">
                <FileText size={14} className="text-veil-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-veil-100 truncate">{d.filename}</div>
                <div className="text-xs text-veil-500 flex items-center gap-2">
                  <span>
                    {d.state === "progressing"
                      ? `${formatBytes(d.receivedBytes)} / ${formatBytes(d.totalBytes)}`
                      : formatBytes(d.totalBytes)}
                  </span>
                  {d.state === "progressing" && (
                    <Loader2 size={10} className="spin text-veil-accent" />
                  )}
                  {d.state === "completed" && <Check size={10} className="text-veil-success" />}
                </div>
                {d.state === "progressing" && d.totalBytes > 0 && (
                  <div className="mt-1 h-1 bg-veil-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-veil-accent transition-all"
                      style={{ width: `${(d.receivedBytes / d.totalBytes) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                className="btn-icon-sm flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); window.veil.downloads.show(d.savePath); }}
                title="Show in folder"
              >
                <FolderOpen size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
