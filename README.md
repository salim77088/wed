# Veil Browser — Privacy-first browser for 2026

> Built with Rust + Tauri 2.0. Powered by Brave's `adblock-rust` engine.

## Overview

Veil is a privacy-focused web browser designed for 2026. Instead of building a browser
engine from scratch, Veil assembles the best open-source components into a unified,
modern browser:

- **Engine**: Native WebView (WebKitGTK on Linux, WebView2 on Windows, WebKit on macOS)
  — minimal resource usage, no bundled Chromium.
- **Ad-block**: Brave's `adblock-rust` engine (the same engine Brave uses, open-sourced).
- **Search**: SearXNG as the default search engine (no tracking, aggregates 70+ engines).
- **Backend**: Rust for memory safety and low resource consumption.
- **Frontend**: SvelteKit for a modern, fast UI.

## Features

### Phase 1 (current)
- ✅ Modern dark UI with cyan privacy accents
- ✅ URL bar with smart parsing (URL detection vs. search query)
- ✅ SearXNG default search engine
- ✅ Embedded ad-block engine (Brave's `adblock-rust`)
- ✅ Live ad-block statistics
- ✅ Settings page with toggles for privacy features
- ✅ Cross-platform builds (Linux, Windows, macOS) via GitHub Actions

### Phase 2 (planned)
- ⏳ Multi-tab browsing within a single window
- ⏳ Native webview per tab (replaces iframe — bypasses X-Frame-Options)
- ⏳ Cosmetic filtering via CSS injection
- ⏳ Canvas/WebGL fingerprinting protection
- ⏳ URL tracking parameter stripping
- ⏳ SponsorBlock integration for YouTube
- ⏳ DNS-over-HTTPS via Quad9
- ⏳ Per-site cookie isolation

### Phase 3 (planned)
- ⏳ Custom extension system
- ⏳ AI-powered tracker detection
- ⏳ YouTube power-saver mode (lower framerate, background pause)
- ⏳ Mobile version (Tauri Mobile)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SvelteKit UI (JS)                     │
│   URL bar · Toolbar · Tab bar · Settings · Start page    │
└──────────────────────────┬──────────────────────────────┘
                           │ Tauri IPC (invoke)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Rust Backend (lib.rs)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  adblock    │  │  privacy     │  │  commands      │  │
│  │  (Brave)    │  │  (Phase 2)   │  │  (Tauri)       │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │ Webview API
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Native WebView                          │
│  (WebKitGTK / WebView2 / WebKit)                         │
└─────────────────────────────────────────────────────────┘
```

## Build

### Prerequisites
- Rust 1.77+ (`rustup`)
- Node.js 20+
- pnpm 9+
- Linux: `libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev`

### Local development
```bash
pnpm install
pnpm tauri dev
```

### Production build
```bash
pnpm install
pnpm tauri build
```

### CI build
This repository ships with `.github/workflows/build.yml` that builds Veil for
Linux, Windows, and macOS on every push to `main`. Artifacts are uploaded to
the workflow run.

## Filter lists

The seed filter lists in `src-tauri/filters/` contain ~120 rules. In production,
the build workflow can download the full lists from upstream sources:

- [EasyList](https://easylist.to/)
- [EasyPrivacy](https://easylist.to/)
- [uBlock Origin filters](https://github.com/uBlockOrigin/uAssets)
- [Fanboy Annoyances](https://easylist.to/)
- [Brave supplemental lists](https://github.com/brave/adblock-lists)

## License

MIT License — see [LICENSE](LICENSE).

## Credits

- [Brave](https://brave.com/) — for open-sourcing `adblock-rust`
- [Tauri](https://tauri.app/) — for the amazing Rust desktop framework
- [SvelteKit](https://kit.svelte.dev/) — for the reactive UI framework
- [SearXNG](https://searxng.org/) — for the privacy-respecting meta-search engine
