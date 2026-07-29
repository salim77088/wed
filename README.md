# Veil Browser

**Privacy-first browser for 2026.** Built on Electron + Chromium + React. No telemetry, no cloud, no compromises.

## Why Veil?

| Brave | Veil |
|-------|------|
| Built-in adblocker (Brave Shields) | uBlock-class engine (@ghostery/adblocker) |
| Crypto rewards / BAT token | None — no ads, no tokens, no business model |
| Telemetry on first run | Zero telemetry, ever |
| Chromium fork (huge maintenance) | Standard Electron (smaller, faster patches) |
| Closed-source sync server | All local — no sync, no account |
| ~250MB install | ~90MB install |

## Features

### Privacy & Blocking
- **uBlock-class ad blocker** — EasyList + EasyPrivacy + uBlock Origin filter lists
- **YouTube ad blocking** — blocks pre-rolls, midrolls, sponsored segments, and tracking endpoints
- **Social widget blocking** — Facebook, Twitter, LinkedIn, TikTok, Bing widgets blocked
- **Anti-fingerprinting** — canvas, WebGL, AudioContext, fonts, plugins, languages, hardware concurrency, device memory, WebRTC IP leak all spoofed
- **HTTPS-only mode** — all HTTP requests auto-upgraded
- **DNS-over-HTTPS** — Cloudflare / Google / Quad9 / Mullvad
- **Tracker blocking** — Disconnect list + Ghostery engine
- **Cookie isolation** — per-tab cookie jars (planned)

### Browser UX
- **Real multi-tab webviews** — each tab is a native `WebContentsView`, not an iframe
- **Arc/Brave-style chrome** — sidebar, tabs strip, address bar, toolbar
- **Search engine picker** — DuckDuckGo / Brave / Startpage / SearXNG / Qwant / Google
- **Local history** — never leaves device
- **Local bookmarks** — never leaves device
- **Keyboard shortcuts** — Ctrl+T, Ctrl+W, Ctrl+R, Alt+Left/Right, Ctrl+L
- **Custom title bar** — Windows/Linux; native hidden inset on macOS
- **Dark theme** — system-aware

### Architecture
```
veil-browser/
├── electron/
│   ├── main.js         # Main process: window, tabs, IPC, adblocker
│   ├── preload.js      # Context bridge
│   └── assets/         # Icons
├── src/                # React + Tailwind chrome (toolbar, sidebar, settings)
│   ├── components/
│   ├── stores/         # Zustand state
│   └── ...
├── public/             # Static pages (newtab)
└── .github/workflows/  # CI build on push
```

## Build

```bash
npm install
npm run dev       # development
npm run dist:win  # build Windows installer
npm run dist:linux
npm run dist:mac
```

## License

MIT
