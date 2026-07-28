<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { stats, refreshStats, type BrowserStats } from '$lib/stores/browser';

  let adblockEnabled = $state(true);
  let fingerprintingProtection = $state(true);
  let trackingProtection = $state(true);
  let youtubeAdBlock = $state(true);
  let dohEnabled = $state(true);
  let javascriptEnabled = $state(true);
  let defaultSearch = $state('SearXNG');

  onMount(async () => {
    await refreshStats();
  });

  function toggleSetting(name: keyof typeof $state, value: boolean) {
    // In Phase 1, these are visual toggles only. Phase 2 wires them to Rust.
    console.log(`Setting ${name} = ${value}`);
  }
</script>

<div class="settings-page">
  <h1 style="margin-bottom: var(--sp-4);">Settings</h1>

  <!-- Privacy section -->
  <div class="settings-section">
    <h2>Privacy & Security</h2>
    <div class="settings-card">
      <div class="settings-row">
        <div>
          <div class="settings-label">Ad & tracker blocking</div>
          <div class="settings-desc">Uses Brave's <code>adblock-rust</code> engine with EasyList + EasyPrivacy + uBO filters</div>
        </div>
        <div class="toggle on" onclick={() => toggleSetting('adblockEnabled', !adblockEnabled)}></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Fingerprinting protection</div>
          <div class="settings-desc">Randomizes canvas, WebGL, audio context fingerprints (Phase 2)</div>
        </div>
        <div class="toggle on" onclick={() => toggleSetting('fingerprintingProtection', !fingerprintingProtection)}></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Cross-site tracking protection</div>
          <div class="settings-desc">Strips tracking parameters and isolates cookies per site (Phase 2)</div>
        </div>
        <div class="toggle on" onclick={() => toggleSetting('trackingProtection', !trackingProtection)}></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">YouTube ad blocking</div>
          <div class="settings-desc">Blocks video ads + integrates SponsorBlock for sponsored segments (Phase 2)</div>
        </div>
        <div class="toggle on" onclick={() => toggleSetting('youtubeAdBlock', !youtubeAdBlock)}></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">DNS-over-HTTPS</div>
          <div class="settings-desc">Routes DNS queries through encrypted Quad9 resolver (Phase 2)</div>
        </div>
        <div class="toggle on" onclick={() => toggleSetting('dohEnabled', !dohEnabled)}></div>
      </div>
    </div>
  </div>

  <!-- Search section -->
  <div class="settings-section">
    <h2>Search</h2>
    <div class="settings-card">
      <div class="settings-row">
        <div>
          <div class="settings-label">Default search engine</div>
          <div class="settings-desc">SearXNG aggregates results from 70+ engines without tracking</div>
        </div>
        <select style="background: var(--bg); color: var(--fg); border: 1px solid var(--border); padding: 6px 12px; border-radius: var(--r-sm); font-family: inherit;">
          <option>SearXNG</option>
          <option>DuckDuckGo</option>
          <option>Brave Search</option>
          <option>Startpage</option>
        </select>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">SearXNG instance</div>
          <div class="settings-desc">Currently using <code>search.bus-hit.me</code> (public instance)</div>
        </div>
        <button class="icon-btn" style="padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--r-sm);">
          Change
        </button>
      </div>
    </div>
  </div>

  <!-- Performance section -->
  <div class="settings-section">
    <h2>Performance</h2>
    <div class="settings-card">
      <div class="settings-row">
        <div>
          <div class="settings-label">JavaScript</div>
          <div class="settings-desc">Disable for maximum privacy & battery savings (breaks most sites)</div>
        </div>
        <div class="toggle on" onclick={() => toggleSetting('javascriptEnabled', !javascriptEnabled)}></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Lazy tab loading</div>
          <div class="settings-desc">Loads background tabs only when activated (Phase 2)</div>
        </div>
        <div class="toggle on"></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">YouTube power saver</div>
          <div class="settings-desc">Pauses background video decoding, limits framerate to 30fps (Phase 2)</div>
        </div>
        <div class="toggle on"></div>
      </div>
    </div>
  </div>

  <!-- Ad-block stats section -->
  <div class="settings-section">
    <h2>Ad-block statistics</h2>
    <div class="settings-card">
      <p style="color: var(--fg-muted); margin-bottom: var(--sp-3);">Live counter of the ad-block engine activity since browser start.</p>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{$stats.rules_loaded.toLocaleString()}</div>
          <div class="stat-label">Rules loaded</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{$stats.requests_checked.toLocaleString()}</div>
          <div class="stat-label">Requests checked</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{$stats.requests_blocked.toLocaleString()}</div>
          <div class="stat-label">Requests blocked</div>
        </div>
      </div>
    </div>
  </div>

  <!-- About section -->
  <div class="settings-section">
    <h2>About</h2>
    <div class="settings-card">
      <div class="settings-row">
        <div>
          <div class="settings-label">Veil Browser</div>
          <div class="settings-desc">v0.1.0 · Built with Rust + Tauri 2.0 · MIT License</div>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Engine</div>
          <div class="settings-desc">WebView (WebKitGTK on Linux, WebView2 on Windows, WebKit on macOS)</div>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Ad-block engine</div>
          <div class="settings-desc">Brave's <code>adblock-rust</code> v0.9 (open source, MPL-2.0)</div>
        </div>
      </div>
    </div>
  </div>

  <div style="text-align: center; padding: var(--sp-4); color: var(--fg-subtle); font-size: 12px;">
    Veil Browser · 2026 edition · <a href="/" style="color: var(--accent);">Back to browser</a>
  </div>
</div>
