<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { parseQuery, refreshStats, stats, type BrowserStats } from '$lib/stores/browser';

  // ─── State ────────────────────────────────────────────────────────
  let urlInput = $state('');
  let currentUrl = $state('');
  let iframeEl: HTMLIFrameElement | null = $state(null);
  let inputEl: HTMLInputElement | null = $state(null);
  let isLoading = $state(false);
  let loadFailed = $state(false);
  let blockedThisPage = $state(0);
  let showStartPage = $state(true);
  let history: string[] = $state([]);
  let historyIndex = $state(-1);

  // ─── Lifecycle ────────────────────────────────────────────────────
  onMount(async () => {
    await refreshStats();
    inputEl?.focus();
    // Refresh stats every 3s to show live ad-block counter
    const interval = setInterval(refreshStats, 3000);
    return () => clearInterval(interval);
  });

  // ─── Navigation ───────────────────────────────────────────────────
  async function navigate(rawInput: string, pushHistory = true) {
    const input = rawInput.trim();
    if (!input) return;

    const target = await parseQuery(input);
    if (!target) return;

    showStartPage = false;
    currentUrl = target;
    urlInput = target;
    isLoading = true;
    loadFailed = false;
    blockedThisPage = 0;

    if (pushHistory) {
      history = [...history.slice(0, historyIndex + 1), target];
      historyIndex = history.length - 1;
    }

    // Update iframe
    if (iframeEl) {
      try {
        iframeEl.src = target;
      } catch (e) {
        console.error('Navigation failed:', e);
        loadFailed = true;
        isLoading = false;
      }
    }

    // After load, fetch cosmetic filters for this URL and inject them
    // (Note: cross-origin iframe blocks injection — this is a known limitation
    //  for Phase 1. Native webview in Phase 2 will enable full cosmetic filtering.)
    try {
      const filters = await invoke<string[]>('get_cosmetic_filters', { url: target });
      console.log(`Cosmetic filters for ${target}:`, filters.length);
    } catch (e) {
      console.warn('Could not get cosmetic filters:', e);
    }
  }

  function handleUrlSubmit(e: SubmitEvent) {
    e.preventDefault();
    navigate(urlInput);
  }

  function handleStartPageSearch(url: string) {
    navigate(url);
  }

  function goBack() {
    if (historyIndex > 0) {
      historyIndex--;
      navigate(history[historyIndex], false);
    }
  }

  function goForward() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      navigate(history[historyIndex], false);
    }
  }

  function reload() {
    if (iframeEl && currentUrl) {
      isLoading = true;
      iframeEl.src = currentUrl;
    }
  }

  function goHome() {
    showStartPage = true;
    currentUrl = '';
    urlInput = '';
    inputEl?.focus();
  }

  function openSettings() {
    window.location.href = '/settings';
  }

  function onIframeLoad() {
    isLoading = false;
    // Try to read the title (will fail for cross-origin — that's expected)
    try {
      const title = iframeEl?.contentDocument?.title;
      if (title) {
        document.title = `${title} — Veil`;
      }
    } catch {
      // Cross-origin: can't read title, that's fine
      document.title = 'Veil — Privacy Browser';
    }
  }

  function onIframeError() {
    isLoading = false;
    loadFailed = true;
  }

  function openInNewWindow() {
    if (currentUrl) {
      window.open(currentUrl, '_blank');
    }
  }

  // ─── Start page shortcuts ─────────────────────────────────────────
  const shortcuts = [
    { label: 'SearXNG', url: 'https://search.bus-hit.me', icon: '🔍' },
    { label: 'Wikipedia', url: 'https://wikipedia.org', icon: '📚' },
    { label: 'GitHub', url: 'https://github.com', icon: '🐙' },
    { label: 'Hacker News', url: 'https://news.ycombinator.com', icon: '📰' },
    { label: 'ProtonMail', url: 'https://proton.me', icon: '✉️' },
    { label: 'ProtonVPN', url: 'https://protonvpn.com', icon: '🛡️' },
    { label: 'Tor Project', url: 'https://torproject.org', icon: '🧅' },
    { label: 'MDN', url: 'https://developer.mozilla.org', icon: '📖' }
  ];

  // Format the URL for display (hide protocol for cleaner look)
  function displayUrl(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
</script>

<div class="app-shell">
  <!-- Toolbar -->
  <div class="app-toolbar">
    <button class="icon-btn" onclick={goBack} disabled={historyIndex <= 0} title="Back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m15 18-6-6 6-6"/>
      </svg>
    </button>
    <button class="icon-btn" onclick={goForward} disabled={historyIndex >= history.length - 1} title="Forward">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </button>
    <button class="icon-btn" onclick={reload} title="Reload">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
      </svg>
    </button>
    <button class="icon-btn" onclick={goHome} title="Home">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </button>

    <!-- URL bar -->
    <form class="url-bar" onsubmit={handleUrlSubmit}>
      <div class="url-bar-icon">
        {#if currentUrl.startsWith('https://')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        {/if}
      </div>
      <input
        bind:this={inputEl}
        bind:value={urlInput}
        class="url-bar-input"
        type="text"
        placeholder="Search with SearXNG or type a URL"
        autocomplete="off"
        spellcheck="false"
      />
      {#if $stats.requests_blocked > 0}
        <div class="shield-badge blocking" title="{$stats.requests_blocked} requests blocked">
          🛡️ {$stats.requests_blocked}
        </div>
      {/if}
    </form>

    <button class="icon-btn" onclick={openSettings} title="Settings">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </div>

  <!-- Content area -->
  <div class="app-content">
    {#if isLoading}
      <div class="loading-bar" style="width: 70%"></div>
    {/if}

    {#if showStartPage}
      <div class="start-page">
        <div class="start-page-logo">Veil</div>
        <div class="start-page-tagline">Privacy-first browser · 2026 edition</div>

        <form class="start-page-search" onsubmit={(e) => { e.preventDefault(); handleStartPageSearch(urlInput); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--fg-muted)">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            bind:value={urlInput}
            type="text"
            placeholder="Search privately with SearXNG, or type a URL..."
            autocomplete="off"
            spellcheck="false"
          />
        </form>

        <div class="start-page-shortcuts">
          {#each shortcuts as s}
            <button class="shortcut-card" onclick={() => handleStartPageSearch(s.url)}>
              <div class="shortcut-icon">{s.icon}</div>
              <div class="shortcut-label">{s.label}</div>
            </button>
          {/each}
        </div>

        <div style="margin-top: var(--sp-6); color: var(--fg-subtle); font-size: 12px; text-align: center;">
          Powered by Rust + Tauri 2.0 · Ad-block engine: Brave's <code style="color: var(--fg-muted);">adblock-rust</code>
        </div>
      </div>
    {:else}
      <div class="webview-host">
        {#if loadFailed}
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--sp-6); text-align: center;">
            <div style="font-size: 48px; margin-bottom: var(--sp-3);">⚠️</div>
            <h2 style="margin-bottom: var(--sp-2);">This site cannot be embedded</h2>
            <p style="color: var(--fg-muted); margin-bottom: var(--sp-4); max-width: 480px;">
              Many sites (Google, YouTube, etc.) prevent embedding via <code>X-Frame-Options</code>.
              Phase 2 will use native webview to bypass this. For now, open in a new window:
            </p>
            <button class="icon-btn" onclick={openInNewWindow} style="background: var(--accent-soft); color: var(--accent); padding: 8px 16px; border-radius: var(--r-md);">
              Open {displayUrl(currentUrl)} in new window
            </button>
          </div>
        {/if}
        <iframe
          bind:this={iframeEl}
          src={currentUrl}
          onload={onIframeLoad}
          on:error={onIframeError}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
          referrerpolicy="no-referrer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
    {/if}
  </div>
</div>
