import { X, Shield, Lock, Fingerprint, Globe, Zap } from "lucide-react";
import { useSettingsStore } from "../stores/settings";

interface Props {
  onClose: () => void;
}

function Toggle({
  on,
  onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
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
  icon,
  title,
  desc,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
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
  const settings = useSettingsStore();

  return (
    <div className="absolute inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-veil-900 border-l border-veil-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-veil-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Settings</h2>
            <span className="text-xs text-veil-500">Veil 0.2.0</span>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Privacy section */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-veil-500 mb-2 flex items-center gap-2">
              <Shield size={12} /> Privacy & Blocking
            </h3>
            <div className="panel divide-y divide-veil-800">
              <SettingRow
                icon={<Shield size={16} />}
                title="Ad & Tracker Blocking"
                desc="uBlock-class engine with EasyList, EasyPrivacy, and uBlock filters. Blocks ads, tracking pixels, and malicious scripts."
                on={settings.adblockEnabled}
                onToggle={() => settings.set("adblockEnabled", !settings.adblockEnabled)}
              />
              <SettingRow
                icon={<Zap size={16} />}
                title="YouTube Ad Blocking"
                desc="Block YouTube video ads, midrolls, and sponsored segments. Uses SponsorBlock + filter rules to skip ads even on embedded videos."
                on={settings.youtubeAdBlocking}
                onToggle={() => settings.set("youtubeAdBlocking", !settings.youtubeAdBlocking)}
              />
              <SettingRow
                icon={<Globe size={16} />}
                title="Block Social Widgets"
                desc="Block Facebook, Twitter, LinkedIn, TikTok, and Bing social tracking widgets embedded in third-party sites."
                on={settings.blockSocialWidgets}
                onToggle={() => settings.set("blockSocialWidgets", !settings.blockSocialWidgets)}
              />
            </div>
          </section>

          {/* Fingerprinting */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-veil-500 mb-2 flex items-center gap-2">
              <Fingerprint size={12} /> Anti-Fingerprinting
            </h3>
            <div className="panel divide-y divide-veil-800">
              <SettingRow
                icon={<Fingerprint size={16} />}
                title="Fingerprinting Protection"
                desc="Spoof canvas, WebGL, AudioContext, fonts, plugins, languages, hardware concurrency, device memory, and WebRTC IP leak. Each session looks unique."
                on={settings.fingerprintingProtection}
                onToggle={() =>
                  settings.set("fingerprintingProtection", !settings.fingerprintingProtection)
                }
              />
            </div>
          </section>

          {/* Network */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-veil-500 mb-2 flex items-center gap-2">
              <Lock size={12} /> Network & DNS
            </h3>
            <div className="panel divide-y divide-veil-800">
              <SettingRow
                icon={<Lock size={16} />}
                title="HTTPS-Only Mode"
                desc="Automatically upgrade all HTTP requests to HTTPS. Blocks mixed content. Recommended for 2026."
                on={settings.httpsOnly}
                onToggle={() => settings.set("httpsOnly", !settings.httpsOnly)}
              />
              <SettingRow
                icon={<Globe size={16} />}
                title="DNS-over-HTTPS (DoH)"
                desc="Encrypt all DNS queries to prevent ISP/government tracking of which sites you visit."
                on={settings.dohEnabled}
                onToggle={() => settings.set("dohEnabled", !settings.dohEnabled)}
              />
              {settings.dohEnabled && (
                <div className="p-3 bg-veil-850">
                  <label className="text-xs text-veil-400 block mb-2">DoH Provider</label>
                  <select
                    value={settings.dohProvider}
                    onChange={(e) => settings.set("dohProvider", e.target.value)}
                    className="input"
                  >
                    <option value="cloudflare">Cloudflare (1.1.1.1) — fast, logs deleted daily</option>
                    <option value="google">Google (8.8.8.8) — global anycast</option>
                    <option value="quad9">Quad9 (9.9.9.9) — malware blocking</option>
                    <option value="mullvad">Mullvad — no logs, EU-based</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Search */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-veil-500 mb-2 flex items-center gap-2">
              <Globe size={12} /> Search Engine
            </h3>
            <div className="panel p-3">
              <select
                value={settings.searchEngine}
                onChange={(e) => settings.set("searchEngine", e.target.value)}
                className="input"
              >
                <option value="duckduckgo">DuckDuckGo — private, no tracking</option>
                <option value="brave">Brave Search — independent index</option>
                <option value="startpage">Startpage — Google results anonymously</option>
                <option value="searx">SearXNG — federated meta-search</option>
                <option value="qwant">Qwant — EU-based, GDPR-strong</option>
                <option value="google">Google (not recommended)</option>
              </select>
              <p className="text-xs text-veil-500 mt-2">
                Veil proxies your search queries. Your search engine never sees your IP address.
              </p>
            </div>
          </section>

          {/* About */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-veil-500 mb-2">About</h3>
            <div className="panel p-4 text-sm text-veil-400 space-y-2">
              <p>
                <strong className="text-veil-200">Veil Browser 0.2.0</strong> — Privacy-first
                browser built on Chromium via Electron.
              </p>
              <p>
                Engine: @ghostery/adblocker (same class as Brave's adblock-rust), with full
                EasyList + EasyPrivacy + uBlock Origin filter lists.
              </p>
              <p>
                All your data (history, bookmarks, settings) stays on this device. No telemetry, no
                analytics, no cloud sync.
              </p>
              <p className="text-xs text-veil-600 pt-2 border-t border-veil-800">
                MIT Licensed. Open source.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
