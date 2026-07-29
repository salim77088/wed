import { X, Shield, Lock, Fingerprint, Globe, Zap, Cpu, HardDrive } from "lucide-react";
import { useSettingsStore } from "../stores/settings";

interface Props {
  onClose: () => void;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      className={`toggle ${on ? "on" : "off"}`}
      onClick={onClick}
      type="button"
      aria-pressed={on}
    >
      <span className="toggle-knob" />
    </button>
  );
}

function SettingRow({
  icon, title, desc, on, onToggle,
}: {
  icon: React.ReactNode; title: string; desc: string; on: boolean; onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-veil-850 transition-colors">
      <div className="flex items-start gap-3">
        <div className="text-veil-accent mt-0.5">{icon}</div>
        <div>
          <div className="text-sm font-medium text-veil-100">{title}</div>
          <div className="text-xs text-veil-400 mt-0.5">{desc}</div>
        </div>
      </div>
      <Toggle on={on} onClick={onToggle} />
    </div>
  );
}

export function SettingsPanel({ onClose }: Props) {
  const s = useSettingsStore();

  return (
    <div className="absolute inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-veil-900 border-l border-veil-700 shadow-lg flex flex-col animate-slide-up"
        style={{ background: "rgba(20, 21, 24, 0.98)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-veil-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Settings</h2>
            <span className="text-xs text-veil-500">Veil 0.4.0</span>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Privacy */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-veil-500 mb-2 flex items-center gap-2 font-semibold">
              <Shield size={12} /> Privacy & Blocking
            </h3>
            <div className="panel divide-y divide-veil-800">
              <SettingRow icon={<Shield size={16} />} title="Ad & Tracker Blocking"
                desc="uBlock-class engine: EasyList + EasyPrivacy + uBlock filters."
                on={s.adblockEnabled} onToggle={() => s.set("adblockEnabled", !s.adblockEnabled)} />
              <SettingRow icon={<Zap size={16} />} title="YouTube Ad Blocking"
                desc="Block YouTube pre-rolls, midrolls, sponsored segments."
                on={s.youtubeAdBlocking} onToggle={() => s.set("youtubeAdBlocking", !s.youtubeAdBlocking)} />
              <SettingRow icon={<Globe size={16} />} title="Block Social Widgets"
                desc="Block FB/Twitter/LinkedIn/TikTok/Bing social trackers."
                on={s.blockSocialWidgets} onToggle={() => s.set("blockSocialWidgets", !s.blockSocialWidgets)} />
            </div>
          </section>

          {/* Fingerprinting */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-veil-500 mb-2 flex items-center gap-2 font-semibold">
              <Fingerprint size={12} /> Anti-Fingerprinting
            </h3>
            <div className="panel divide-y divide-veil-800">
              <SettingRow icon={<Fingerprint size={16} />} title="Fingerprinting Protection"
                desc="Spoof canvas, WebGL, AudioContext, fonts, plugins, WebRTC, battery."
                on={s.fingerprintingProtection} onToggle={() => s.set("fingerprintingProtection", !s.fingerprintingProtection)} />
            </div>
          </section>

          {/* Network */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-veil-500 mb-2 flex items-center gap-2 font-semibold">
              <Lock size={12} /> Network & DNS
            </h3>
            <div className="panel divide-y divide-veil-800">
              <SettingRow icon={<Lock size={16} />} title="HTTPS-Only Mode"
                desc="Auto-upgrade HTTP to HTTPS. Blocks mixed content."
                on={s.httpsOnly} onToggle={() => s.set("httpsOnly", !s.httpsOnly)} />
              <SettingRow icon={<Globe size={16} />} title="DNS-over-HTTPS (DoH)"
                desc="Encrypt DNS queries to prevent ISP tracking."
                on={s.dohEnabled} onToggle={() => s.set("dohEnabled", !s.dohEnabled)} />
              {s.dohEnabled && (
                <div className="p-3 bg-veil-850">
                  <label className="text-xs text-veil-400 block mb-2">DoH Provider</label>
                  <select value={s.dohProvider} onChange={(e) => s.set("dohProvider", e.target.value)} className="input">
                    <option value="cloudflare">Cloudflare (1.1.1.1) — fast</option>
                    <option value="google">Google (8.8.8.8)</option>
                    <option value="quad9">Quad9 (9.9.9.9) — malware blocking</option>
                    <option value="mullvad">Mullvad — no logs</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Performance / RAM */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-veil-500 mb-2 flex items-center gap-2 font-semibold">
              <Cpu size={12} /> Performance & RAM
            </h3>
            <div className="panel divide-y divide-veil-800">
              <SettingRow icon={<Cpu size={16} />} title="Suspend Inactive Tabs"
                desc="Background-throttle tabs you haven't viewed in a while."
                on={s.suspendInactiveTabs} onToggle={() => s.set("suspendInactiveTabs", !s.suspendInactiveTabs)} />
              <div className="p-3 bg-veil-850">
                <label className="text-xs text-veil-400 block mb-2">Suspend after (minutes)</label>
                <input
                  type="number" min={1} max={60}
                  value={s.suspendAfterMinutes}
                  onChange={(e) => s.set("suspendAfterMinutes", Number(e.target.value))}
                  className="input"
                />
              </div>
              <div className="p-3 bg-veil-850">
                <label className="text-xs text-veil-400 block mb-2 flex items-center gap-2">
                  <HardDrive size={12} /> Disk Cache Limit (MB)
                </label>
                <input
                  type="number" min={10} max={2000} step={10}
                  value={s.cacheLimitMB}
                  onChange={(e) => s.set("cacheLimitMB", Number(e.target.value))}
                  className="input"
                />
                <p className="text-[10px] text-veil-500 mt-1">Lower = less RAM/disk, but sites may load slower on revisit.</p>
              </div>
            </div>
          </section>

          {/* Search */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-veil-500 mb-2 flex items-center gap-2 font-semibold">
              <Globe size={12} /> Search Engine
            </h3>
            <div className="panel p-3">
              <select value={s.searchEngine} onChange={(e) => s.set("searchEngine", e.target.value)} className="input">
                <option value="duckduckgo">DuckDuckGo — private, no tracking</option>
                <option value="brave">Brave Search — independent index</option>
                <option value="startpage">Startpage — Google results anonymously</option>
                <option value="searx">SearXNG — federated meta-search</option>
                <option value="qwant">Qwant — EU-based, GDPR-strong</option>
                <option value="google">Google (not recommended)</option>
              </select>
            </div>
          </section>

          {/* About */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-veil-500 mb-2 font-semibold">About</h3>
            <div className="panel p-4 text-sm text-veil-400 space-y-2">
              <p><strong className="text-veil-200">Veil Browser 0.4.0</strong> — Privacy-first browser built on Chromium via Electron.</p>
              <p>Engine: @ghostery/adblocker (uBlock-class). All data stays on this device.</p>
              <p className="text-xs text-veil-600 pt-2 border-t border-veil-800">MIT Licensed. Open source.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
