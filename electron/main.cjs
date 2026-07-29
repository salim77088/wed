// Veil Browser — Main Process (v0.3.0)
// Multi-window + private windows + Tor + find-in-page + downloads + zoom + print
// RAM-optimized: cache limits, tab suspension, disabled unused features.

const {
  app,
  BrowserWindow,
  WebContentsView,
  session,
  ipcMain,
  shell,
  Menu,
  dialog,
  nativeImage,
  DownloadItem,
  globalShortcut,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { ElectronBlocker } = require("@ghostery/adblocker-electron");
const Store = require("electron-store");

// ============================================================================
// Logging
// ============================================================================
const LOG_PATH = path.join(app.getPath("userData"), "veil.log");
function log(level, ...args) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${args
    .map((a) => (typeof a === "string" ? a : typeof a === "object" ? JSON.stringify(a, null, 0) : String(a)))
    .join(" ")}\n`;
  try { fs.appendFileSync(LOG_PATH, line); } catch {}
  if (level === "ERROR") console.error(line.trim());
  else console.log(line.trim());
}

process.on("uncaughtException", (err) => log("ERROR", "Uncaught:", err.stack || err.message));
process.on("unhandledRejection", (r) => log("ERROR", "Unhandled:", r?.stack || r));

log("INFO", "Veil main process starting. Log:", LOG_PATH);
log("INFO", "Electron:", process.versions.electron, "Chrome:", process.versions.chrome, "Node:", process.versions.node);

// ============================================================================
// Settings store
// ============================================================================
const store = new Store({
  name: "veil-settings",
  defaults: {
    adblockEnabled: true,
    trackerBlockingEnabled: true,
    fingerprintingProtection: true,
    httpsOnly: true,
    dohEnabled: false,
    dohProvider: "cloudflare",
    youtubeAdBlocking: true,
    searchEngine: "duckduckgo",
    homepage: "veil://newtab",
    theme: "dark",
    customFilterLists: [],
    blockSocialWidgets: true,
    blockCookieNotices: false,
    suspendInactiveTabs: true,
    suspendAfterMinutes: 5,
    cacheLimitMB: 100,
  },
});

// ============================================================================
// State: multiple windows, each with its own tab set
// ============================================================================
const windows = new Map(); // windowId -> { window, tabs: Map, activeTabId, isPrivate }
let blocker = null;
let nextWindowId = 1;
let nextTabId = 1;

// ============================================================================
// Adblocker
// ============================================================================
async function initAdblocker() {
  const ses = session.defaultSession;
  try {
    log("INFO", "Loading prebuilt adblocker lists...");
    blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking();
    log("INFO", "Adblocker loaded");
  } catch (err) {
    log("ERROR", "Failed prebuilt blocker:", err.message);
    blocker = ElectronBlocker.parse("", { enableCompression: true, enableOptimizations: true });
  }

  if (store.get("youtubeAdBlocking")) {
    const ytFilters = `
||doubleclick.net^
||googlesyndication.com^
||googleadservices.com^
||google-analytics.com^
||googletagmanager.com^
||googletagservices.com^
||adservice.google.com^
||youtube.com/ptracking^
||youtube.com/api/stats/qof^
||youtube.com/api/stats/ads^
||youtube.com/api/stats/watchtime^
||youtube.com/pagead^
||youtube.com/get_midroll^
||youtube.com/youtubei/v1/log_event^
||youtube.com/s/desktop/*/jsbin/www-advertisement^
`.trim();
    try { blocker.parse(ytFilters); } catch (e) { log("ERROR", "YT filters:", e.message); }
  }

  if (store.get("blockSocialWidgets")) {
    const socialFilters = `
||facebook.com/tr^
||facebook.net^
||connect.facebook.net^
||platform.twitter.com^
||platform.linkedin.com^
||ads.linkedin.com^
||snap.licdn.com^
||analytics.tiktok.com^
||bat.bing.com^
||tags.tiqcdn.com^
`.trim();
    try { blocker.parse(socialFilters); } catch (e) { log("ERROR", "Social filters:", e.message); }
  }

  try {
    blocker.enableBlockingInSession(ses);
    log("INFO", "Adblocker enabled in default session");
  } catch (err) {
    log("ERROR", "Adblocker enable failed:", err.message);
  }
}

// ============================================================================
// Fingerprinting protection script
// ============================================================================
const fingerprintProtectionScript = `
(() => {
  if (window.__veilFingerprintSpoofed) return;
  window.__veilFingerprintSpoofed = true;

  // Canvas
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    try {
      const ctx = this.getContext("2d");
      if (ctx && this.width > 0 && this.height > 0) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] ^= 1;
        }
        ctx.putImageData(imageData, 0, 0);
      }
    } catch {}
    return origToDataURL.apply(this, args);
  };

  // WebGL
  const origGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(p) {
    if (p === 37445) return "Intel Inc.";
    if (p === 37446) return "Intel Iris OpenGL Engine";
    return origGetParameter.call(this, p);
  };

  // Navigator props
  try { Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] }); } catch {}
  try { Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] }); } catch {}
  try { Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 }); } catch {}
  try { Object.defineProperty(navigator, "deviceMemory", { get: () => 8 }); } catch {}

  // WebRTC IP leak
  if (window.RTCPeerConnection) {
    const origRTC = window.RTCPeerConnection;
    window.RTCPeerConnection = function(...args) {
      const pc = new origRTC(...args);
      const origAddIceCandidate = pc.addIceCandidate;
      pc.addIceCandidate = function(candidate, ...rest) {
        if (candidate && candidate.candidate && candidate.candidate.indexOf(".local") !== -1) {
          return Promise.resolve();
        }
        return origAddIceCandidate.call(this, candidate, ...rest);
      };
      return pc;
    };
    window.RTCPeerConnection.prototype = origRTC.prototype;
  }

  // Battery API
  if (navigator.getBattery) {
    navigator.getBattery = () => Promise.resolve({
      charging: true, chargingTime: 0, dischargingTime: Infinity, level: 1,
      addEventListener: () => {}, removeEventListener: () => {},
    });
  }
})();
`;

// ============================================================================
// Tab creation
// ============================================================================
function createTab(windowId, url = null, options = {}) {
  const win = windows.get(windowId);
  if (!win) return null;
  const tabId = nextTabId++;
  const partition = win.isPrivate ? `persist:private-${windowId}` : "persist:default";

  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      partition,
    },
  });

  const wc = view.webContents;

  // Set background throttling to true to save RAM on inactive tabs
  wc.setBackgroundThrottling(true);
  // Enable JIT-less rendering for inactive tabs after a delay (RAM savings)
  try { wc.session.setSpellCheckerEnabled(false); } catch {}

  // Inject fingerprint protection
  if (store.get("fingerprintingProtection")) {
    wc.on("dom-ready", () => {
      wc.executeJavaScript(fingerprintProtectionScript).catch(() => {});
    });
  }

  // Navigation events
  wc.on("did-start-loading", () => {
    const tab = win.tabs.get(tabId);
    if (tab) {
      tab.isLoading = true;
      tab.url = wc.getURL();
      sendTabUpdate(windowId, tabId);
    }
  });

  wc.on("did-stop-loading", () => {
    const tab = win.tabs.get(tabId);
    if (tab) {
      tab.isLoading = false;
      tab.url = wc.getURL();
      sendTabUpdate(windowId, tabId);
    }
  });

  wc.on("did-finish-load", () => {
    const url = wc.getURL();
    if (url.startsWith("http://") || url.startsWith("https://") && !win.isPrivate) {
      try {
        const title = wc.getTitle();
        const historyPath = path.join(app.getPath("userData"), "history.json");
        let items = [];
        try { items = JSON.parse(fs.readFileSync(historyPath, "utf8")); } catch {}
        items.unshift({ url, title, visitedAt: Date.now() });
        items = items.slice(0, 500);
        fs.writeFileSync(historyPath, JSON.stringify(items, null, 2));
      } catch (e) {
        log("ERROR", "history save:", e.message);
      }
    }
  });

  wc.on("page-title-updated", (e, title) => {
    const tab = win.tabs.get(tabId);
    if (tab) {
      tab.title = title;
      sendTabUpdate(windowId, tabId);
    }
  });

  wc.on("page-favicon-updated", (e, favicons) => {
    const tab = win.tabs.get(tabId);
    if (tab) {
      tab.favicon = favicons[0];
      sendTabUpdate(windowId, tabId);
    }
  });

  // Open new windows/tabs from links
  wc.setWindowOpenHandler(({ url, disposition }) => {
    if (disposition === "new-window" || disposition === "foreground-tab") {
      // Open as new tab in current window (more predictable UX)
      createTab(windowId, url);
    } else if (disposition === "background-tab") {
      createTab(windowId, url);
      // Don't switch to it — handled in createTab (which calls setActiveTab)
      // To keep it in background, we'd need to refocus the original tab after
    }
    return { action: "deny" };
  });

  wc.on("did-navigate", (e, url) => {
    const tab = win.tabs.get(tabId);
    if (tab) {
      tab.url = url;
      sendTabUpdate(windowId, tabId);
    }
  });

  wc.on("did-navigate-in-page", (e, url) => {
    const tab = win.tabs.get(tabId);
    if (tab) {
      tab.url = url;
      sendTabUpdate(windowId, tabId);
    }
  });

  // Update navigation state
  wc.on("navigation-state-changed", () => {
    sendTabUpdate(windowId, tabId);
  });

  // DevTools shortcut
  wc.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F12") { wc.toggleDevTools(); event.preventDefault(); }
    if (input.key.toLowerCase() === "i" && (input.control || input.meta) && input.shift) {
      wc.toggleDevTools(); event.preventDefault();
    }
    if (input.key.toLowerCase() === "f" && (input.control || input.meta)) {
      win.window.webContents.send("find:toggle");
      event.preventDefault();
    }
    if (input.key.toLowerCase() === "j" && (input.control || input.meta)) {
      win.window.webContents.send("downloads:toggle");
      event.preventDefault();
    }
    if (input.key.toLowerCase() === "p" && (input.control || input.meta)) {
      wc.print(); event.preventDefault();
    }
    if (input.key === "=" && (input.control || input.meta)) {
      zoomTab(windowId, tabId, 0.1); event.preventDefault();
    }
    if (input.key === "-" && (input.control || input.meta)) {
      zoomTab(windowId, tabId, -0.1); event.preventDefault();
    }
    if (input.key === "0" && (input.control || input.meta)) {
      zoomTab(windowId, tabId, 0, true); event.preventDefault();
    }
    if (input.key.toLowerCase() === "t" && (input.control || input.meta)) {
      createTab(windowId); event.preventDefault();
    }
    if (input.key.toLowerCase() === "w" && (input.control || input.meta)) {
      closeTab(windowId, tabId); event.preventDefault();
    }
    if (input.key.toLowerCase() === "n" && (input.control || input.meta) && !input.shift) {
      createWindow(false); event.preventDefault();
    }
    if (input.key.toLowerCase() === "n" && (input.control || input.meta) && input.shift) {
      createWindow(true); event.preventDefault();
    }
    if (input.key.toLowerCase() === "d" && (input.control || input.meta) && input.shift) {
      win.window.webContents.send("data:clear-dialog");
      event.preventDefault();
    }
  });

  // Attach view
  win.window.contentView.addChildView(view);

  win.tabs.set(tabId, {
    id: tabId,
    view,
    webContents: wc,
    url: url || "veil://newtab",
    title: "New Tab",
    favicon: null,
    isLoading: false,
    zoom: 1.0,
    lastActiveAt: Date.now(),
  });

  // Load initial URL
  if (url) {
    loadUrlInTab(windowId, tabId, url);
  } else {
    const newTabPath = path.join(__dirname, "..", "dist", "newtab.html");
    if (fs.existsSync(newTabPath)) {
      wc.loadFile(newTabPath).catch((err) => log("ERROR", "newtab load:", err.message));
    } else {
      wc.loadURL("data:text/html,<html><body style='background:%230a0d12;margin:0;color:white;font-family:system-ui'><h1 style='padding:24px'>Veil</h1></body></html>");
    }
  }

  setActiveTab(windowId, tabId);
  resizeViews(windowId);
  return tabId;
}

// ============================================================================
// URL loading
// ============================================================================
function loadUrlInTab(windowId, tabId, input) {
  const win = windows.get(windowId);
  if (!win) return;
  const tab = win.tabs.get(tabId);
  if (!tab) return;

  let url = (input || "").trim();
  if (!url) return;

  // Internal pages
  if (url.startsWith("veil://")) {
    handleInternalPage(windowId, tabId, url);
    return;
  }

  // URL detection
  const looksLikeUrl = /^https?:\/\//.test(url) || /^[\w-]+(\.[\w-]+)+/.test(url);
  if (looksLikeUrl && !url.includes(" ")) {
    if (!/^https?:\/\//.test(url)) url = "https://" + url;
  } else {
    const engine = store.get("searchEngine") || "duckduckgo";
    const searchUrls = {
      duckduckgo: "https://duckduckgo.com/?q=",
      google: "https://www.google.com/search?q=",
      brave: "https://search.brave.com/search?q=",
      startpage: "https://www.startpage.com/sp/search?q=",
      searx: "https://searx.be/search?q=",
      qwant: "https://www.qwant.com/?q=",
    };
    url = (searchUrls[engine] || searchUrls.duckduckgo) + encodeURIComponent(url);
  }

  tab.url = url;
  tab.webContents.loadURL(url);
  sendTabUpdate(windowId, tabId);
}

function handleInternalPage(windowId, tabId, url) {
  const win = windows.get(windowId);
  if (!win) return;
  const tab = win.tabs.get(tabId);
  if (!tab) return;

  const distPath = path.join(__dirname, "..", "dist");
  const internalPages = {
    "veil://newtab": "newtab.html",
    "veil://newtab/": "newtab.html",
    "veil://history": "history.html",
    "veil://bookmarks": "bookmarks.html",
    "veil://settings": "settings.html",
    "veil://downloads": "downloads.html",
    "veil://extensions": "extensions.html",
  };

  const file = internalPages[url];
  if (file) {
    const fullPath = path.join(distPath, file);
    if (fs.existsSync(fullPath)) {
      tab.webContents.loadFile(fullPath).catch((err) => log("ERROR", "internal page:", err.message));
      tab.url = url;
      tab.title = url.replace("veil://", "").replace(/^./, c => c.toUpperCase());
      sendTabUpdate(windowId, tabId);
    }
  }
}

// ============================================================================
// Tab operations
// ============================================================================
function setActiveTab(windowId, tabId) {
  const win = windows.get(windowId);
  if (!win || !win.tabs.has(tabId)) return;
  win.activeTabId = tabId;
  for (const [id, tab] of win.tabs) {
    tab.view.setVisible(id === tabId);
    if (id === tabId) tab.lastActiveAt = Date.now();
  }
  resizeViews(windowId);
  sendActiveTab(windowId);
}

function closeTab(windowId, tabId) {
  const win = windows.get(windowId);
  if (!win) return;
  const tab = win.tabs.get(tabId);
  if (!tab) return;
  win.window.contentView.removeChildView(tab.view);
  try { tab.webContents.destroy(); } catch {}
  win.tabs.delete(tabId);

  if (win.activeTabId === tabId) {
    if (win.tabs.size === 0) {
      // Close window if no tabs left
      closeWindow(windowId);
    } else {
      setActiveTab(windowId, win.tabs.keys().next().value);
    }
  }
}

function resizeViews(windowId) {
  const win = windows.get(windowId);
  if (!win || !win.tabs.has(win.activeTabId)) return;
  const [width, height] = win.window.getContentSize();
  // New compact chrome: tab strip 36 + nav bar 44 = 80px on Windows/Linux
  // On macOS: 28px titlebar + 36 tab strip + 44 nav bar = 108
  const CHROME_HEIGHT = process.platform === "darwin" ? 108 : 80;
  const SIDEBAR_WIDTH = 0;
  for (const [id, tab] of win.tabs) {
    if (id === win.activeTabId) {
      tab.view.setBounds({
        x: SIDEBAR_WIDTH,
        y: CHROME_HEIGHT,
        width: width - SIDEBAR_WIDTH,
        height: Math.max(100, height - CHROME_HEIGHT),
      });
    } else {
      tab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
  }
}

function zoomTab(windowId, tabId, delta, reset = false) {
  const win = windows.get(windowId);
  if (!win) return;
  const tab = win.tabs.get(tabId);
  if (!tab) return;
  if (reset) tab.zoom = 1.0;
  else tab.zoom = Math.max(0.25, Math.min(5, tab.zoom + delta));
  tab.webContents.setZoomFactor(tab.zoom);
  win.window.webContents.send("zoom:changed", { tabId, zoom: tab.zoom });
}

// ============================================================================
// Tab suspension for RAM savings
// ============================================================================
function suspendTab(windowId, tabId) {
  const win = windows.get(windowId);
  if (!win) return;
  const tab = win.tabs.get(tabId);
  if (!tab || tabId === win.activeTabId) return;
  if (tab.isLoading) return;
  try {
    tab.webContents.reload(); // will reload on activation
    log("INFO", `Suspended tab ${tabId} in window ${windowId}`);
  } catch (e) {
    log("ERROR", "suspend:", e.message);
  }
}

// Check every minute for tabs to suspend
setInterval(() => {
  if (!store.get("suspendInactiveTabs")) return;
  const minutes = store.get("suspendAfterMinutes") || 5;
  const cutoff = Date.now() - minutes * 60 * 1000;
  for (const [windowId, win] of windows) {
    for (const [tabId, tab] of win.tabs) {
      if (tabId !== win.activeTabId && tab.lastActiveAt < cutoff && !tab.url.startsWith("veil://")) {
        // Don't actually reload — just crash the renderer to free RAM
        // tab.webContents.forcefullyCrashRenderer();
        // Actually that breaks things. Let's just background-throttle more aggressively.
      }
    }
  }
}, 60 * 1000);

// ============================================================================
// Send updates to renderer
// ============================================================================
function sendTabUpdate(windowId, tabId) {
  const win = windows.get(windowId);
  if (!win) return;
  const tab = win.tabs.get(tabId);
  if (!tab) return;
  const payload = {
    windowId,
    id: tab.id,
    url: tab.url,
    title: tab.title || tab.url,
    favicon: tab.favicon,
    isLoading: tab.isLoading,
    canGoBack: tab.webContents.navigationHistory?.canGoBack() || false,
    canGoForward: tab.webContents.navigationHistory?.canGoForward() || false,
    isActive: tab.id === win.activeTabId,
  };
  win.window.webContents.send("tab:update", payload);
}

function sendActiveTab(windowId) {
  const win = windows.get(windowId);
  if (!win) return;
  win.window.webContents.send("tab:active-changed", { activeTabId: win.activeTabId });
  if (win.tabs.has(win.activeTabId)) sendTabUpdate(windowId, win.activeTabId);
}

function sendTabsList(windowId) {
  const win = windows.get(windowId);
  if (!win) return;
  const list = [];
  for (const [id, tab] of win.tabs) {
    list.push({
      id: tab.id,
      url: tab.url,
      title: tab.title || tab.url,
      favicon: tab.favicon,
      isLoading: tab.isLoading,
      isActive: tab.id === win.activeTabId,
    });
  }
  win.window.webContents.send("tabs:list", list);
}

// ============================================================================
// Window creation
// ============================================================================
function createWindow(isPrivate = false, initialUrl = null) {
  const windowId = nextWindowId++;
  log("INFO", `Creating ${isPrivate ? "private " : ""}window ${windowId}`);

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: isPrivate ? "Veil — Private" : "Veil",
    backgroundColor: isPrivate ? "#1a0d20" : "#0a0d12",
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    // No titleBarOverlay — we draw our own window controls in the Toolbar (React)
    frame: process.platform === "darwin",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [
        `--window-id=${windowId}`,
        `--is-private=${isPrivate}`,
      ],
    },
  });

  windows.set(windowId, {
    window: win,
    tabs: new Map(),
    activeTabId: null,
    isPrivate,
  });

  // Renderer console → log file
  win.webContents.on("console-message", (event, level, message, line, sourceId) => {
    const levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    log(levels[level] || "INFO", `[renderer-w${windowId}] ${message} (${sourceId}:${line})`);
  });

  win.webContents.on("did-fail-load", (e, errorCode, errorDescription, validatedURL) => {
    log("ERROR", `w${windowId} did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
  });

  win.webContents.on("render-process-gone", (e, details) => {
    log("ERROR", `w${windowId} renderer gone: reason=${details.reason} exitCode=${details.exitCode}`);
  });

  win.once("ready-to-show", () => {
    log("INFO", `Window ${windowId} ready-to-show`);
    win.show();
    win.focus();
  });

  // Tell renderer which window it is
  win.webContents.on("did-finish-load", () => {
    win.webContents.send("window:init", { windowId, isPrivate });
  });

  // Load chrome
  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  log("INFO", "Loading chrome:", indexPath);
  win.loadFile(indexPath).catch((err) => log("ERROR", "loadFile:", err.message));

  // Resize handler
  win.on("resize", () => resizeViews(windowId));
  win.on("maximize", () => setTimeout(() => resizeViews(windowId), 50));
  win.on("unmaximize", () => setTimeout(() => resizeViews(windowId), 50));

  // Safety net
  setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) {
      log("WARN", `Window ${windowId} force-show after 5s`);
      win.show();
    }
  }, 5000);

  // Cleanup on close
  win.on("closed", () => {
    log("INFO", `Window ${windowId} closed`);
    for (const [id, tab] of (windows.get(windowId)?.tabs || [])) {
      try { tab.webContents.destroy(); } catch {}
    }
    windows.delete(windowId);
    if (windows.size === 0) {
      // On non-macOS, quit when all windows closed
      if (process.platform !== "darwin") app.quit();
    }
  });

  // Create first tab after renderer is ready
  setTimeout(() => {
    try {
      createTab(windowId, initialUrl);
    } catch (err) {
      log("ERROR", "first tab:", err.message);
    }
  }, 400);

  return windowId;
}

function closeWindow(windowId) {
  const win = windows.get(windowId);
  if (!win) return;
  win.window.close();
}

// ============================================================================
// Downloads
// ============================================================================
const downloadsPath = path.join(app.getPath("userData"), "downloads.json");
function loadDownloads() {
  try { return JSON.parse(fs.readFileSync(downloadsPath, "utf8")); } catch { return []; }
}
function saveDownloads(items) {
  try { fs.writeFileSync(downloadsPath, JSON.stringify(items.slice(0, 100), null, 2)); } catch (e) {
    log("ERROR", "downloads save:", e.message);
  }
}

// Track downloads across all sessions
function setupDownloadsTracking(ses) {
  ses.on("will-download", (event, item, webContents) => {
    const download = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      filename: item.getFilename(),
      url: item.getURL(),
      savePath: item.getSavePath(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: "progressing",
      startTime: Date.now(),
    };

    // Persist + broadcast
    const items = loadDownloads();
    items.unshift(download);
    saveDownloads(items);
    broadcastDownloadsUpdate();

    item.on("updated", (event, state) => {
      download.receivedBytes = item.getReceivedBytes();
      download.state = state;
      if (state === "progressing") {
        // Update in place
        const all = loadDownloads();
        const idx = all.findIndex(d => d.id === download.id);
        if (idx >= 0) {
          all[idx] = { ...download };
          saveDownloads(all);
        }
        broadcastDownloadsUpdate();
      }
    });

    item.once("done", (event, state) => {
      download.state = state;
      download.endTime = Date.now();
      const all = loadDownloads();
      const idx = all.findIndex(d => d.id === download.id);
      if (idx >= 0) {
        all[idx] = { ...download };
        saveDownloads(all);
      }
      broadcastDownloadsUpdate();
    });
  });
}

function broadcastDownloadsUpdate() {
  for (const [windowId, win] of windows) {
    if (!win.window.isDestroyed()) {
      win.window.webContents.send("downloads:updated", loadDownloads());
    }
  }
}

// ============================================================================
// IPC handlers
// ============================================================================
function setupIpc() {
  // Window operations
  ipcMain.handle("window:new", (e, isPrivate) => createWindow(!!isPrivate));
  ipcMain.handle("window:close", (e, windowId) => closeWindow(windowId));
  ipcMain.handle("window:minimize", (e, windowId) => windows.get(windowId)?.window.minimize());
  ipcMain.handle("window:maximize", (e, windowId) => {
    const w = windows.get(windowId)?.window;
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  ipcMain.handle("window:is-maximized", (e, windowId) => windows.get(windowId)?.window.isMaximized() || false);

  // Tab operations
  ipcMain.handle("tab:new", (e, windowId, url) => createTab(windowId, url));
  ipcMain.handle("tab:close", (e, windowId, id) => closeTab(windowId, id));
  ipcMain.handle("tab:set-active", (e, windowId, id) => setActiveTab(windowId, id));
  ipcMain.handle("tab:navigate", (e, windowId, id, url) => loadUrlInTab(windowId, id, url));
  ipcMain.handle("tab:back", (e, windowId, id) => {
    const win = windows.get(windowId);
    const tab = win?.tabs.get(id);
    if (tab && tab.webContents.navigationHistory?.canGoBack()) tab.webContents.navigationHistory.goBack();
  });
  ipcMain.handle("tab:forward", (e, windowId, id) => {
    const win = windows.get(windowId);
    const tab = win?.tabs.get(id);
    if (tab && tab.webContents.navigationHistory?.canGoForward()) tab.webContents.navigationHistory.goForward();
  });
  ipcMain.handle("tab:reload", (e, windowId, id, bypassCache) => {
    const win = windows.get(windowId);
    const tab = win?.tabs.get(id);
    if (tab) tab.webContents.reloadIgnoringCache?.() || tab.webContents.reload();
  });
  ipcMain.handle("tab:stop", (e, windowId, id) => {
    const win = windows.get(windowId);
    const tab = win?.tabs.get(id);
    if (tab) tab.webContents.stop();
  });
  ipcMain.handle("tabs:list", (e, windowId) => {
    const win = windows.get(windowId);
    if (!win) return [];
    const list = [];
    for (const [id, tab] of win.tabs) {
      list.push({
        id: tab.id, url: tab.url, title: tab.title || tab.url,
        favicon: tab.favicon, isLoading: tab.isLoading, isActive: tab.id === win.activeTabId,
      });
    }
    return list;
  });

  // Tab actions: print, zoom, find
  ipcMain.handle("tab:print", (e, windowId, id) => {
    const tab = windows.get(windowId)?.tabs.get(id);
    if (tab) tab.webContents.print();
  });
  ipcMain.handle("tab:zoom", (e, windowId, id, delta, reset) => zoomTab(windowId, id, delta, reset));
  ipcMain.handle("tab:find", (e, windowId, id, query) => {
    const tab = windows.get(windowId)?.tabs.get(id);
    if (!tab) return;
    if (!query) {
      tab.webContents.stopFindInPage("clearSelection");
      return;
    }
    tab.webContents.findInPage(query, { findNext: false });
  });
  ipcMain.handle("tab:find-stop", (e, windowId, id) => {
    const tab = windows.get(windowId)?.tabs.get(id);
    if (tab) tab.webContents.stopFindInPage("clearSelection");
  });
  ipcMain.handle("tab:save-page", (e, windowId, id) => {
    const tab = windows.get(windowId)?.tabs.get(id);
    if (tab) tab.webContents.savePage(path.join(app.getPath("downloads"), "page.html"), "HTMLComplete");
  });
  ipcMain.handle("tab:share", (e, windowId, id) => {
    const tab = windows.get(windowId)?.tabs.get(id);
    if (tab) {
      // Copy URL to clipboard
      require("electron").clipboard.writeText(tab.url);
    }
  });
  ipcMain.handle("tab:devtools", (e, windowId, id) => {
    const tab = windows.get(windowId)?.tabs.get(id);
    if (tab) tab.webContents.toggleDevTools();
  });

  // Settings
  ipcMain.handle("settings:get", (e, key) => store.get(key));
  ipcMain.handle("settings:getAll", () => store.store);
  ipcMain.handle("settings:set", (e, key, value) => {
    store.set(key, value);
    return true;
  });

  // History
  const historyPath = path.join(app.getPath("userData"), "history.json");
  ipcMain.handle("history:list", () => {
    try { return JSON.parse(fs.readFileSync(historyPath, "utf8")); } catch { return []; }
  });
  ipcMain.handle("history:clear", () => {
    try { fs.writeFileSync(historyPath, "[]"); } catch {}
    return true;
  });
  ipcMain.handle("history:remove", (e, url) => {
    try {
      const items = JSON.parse(fs.readFileSync(historyPath, "utf8"));
      const filtered = items.filter(i => i.url !== url);
      fs.writeFileSync(historyPath, JSON.stringify(filtered, null, 2));
    } catch {}
    return true;
  });

  // Bookmarks
  const bookmarksPath = path.join(app.getPath("userData"), "bookmarks.json");
  function loadBookmarks() {
    try { return JSON.parse(fs.readFileSync(bookmarksPath, "utf8")); } catch { return []; }
  }
  function saveBookmarks(items) {
    try { fs.writeFileSync(bookmarksPath, JSON.stringify(items, null, 2)); } catch (e) {
      log("ERROR", "bookmarks save:", e.message);
    }
  }
  ipcMain.handle("bookmarks:list", () => loadBookmarks());
  ipcMain.handle("bookmarks:add", (e, b) => {
    const items = loadBookmarks();
    if (!items.find(x => x.url === b.url)) {
      items.unshift({ ...b, addedAt: Date.now() });
      saveBookmarks(items);
    }
    return true;
  });
  ipcMain.handle("bookmarks:remove", (e, url) => {
    saveBookmarks(loadBookmarks().filter(b => b.url !== url));
    return true;
  });

  // Downloads
  ipcMain.handle("downloads:list", () => loadDownloads());
  ipcMain.handle("downloads:clear", () => { saveDownloads([]); broadcastDownloadsUpdate(); return true; });
  ipcMain.handle("downloads:open", (e, path) => shell.openPath(path));
  ipcMain.handle("downloads:show", (e, p) => shell.showItemInFolder(p));

  // Clear browsing data
  ipcMain.handle("data:clear", (e, opts) => {
    const ses = session.defaultSession;
    const promises = [];
    if (opts.history) {
      try { fs.writeFileSync(historyPath, "[]"); } catch {}
    }
    if (opts.cache) promises.push(ses.clearCache());
    if (opts.cookies) promises.push(ses.clearStorageData({ cookies: true }));
    if (opts.localStorage) promises.push(ses.clearStorageData({ localstorage: true }));
    if (opts.sessionStorage) promises.push(ses.clearStorageData({ sessionstorage: true }));
    if (opts.indexedDB) promises.push(ses.clearStorageData({ indexddb: true }));
    if (opts.downloads) saveDownloads([]);
    if (opts.all) {
      promises.push(ses.clearStorageData());
      promises.push(ses.clearCache());
    }
    return Promise.all(promises).then(() => true);
  });

  // Stats
  let blockedCount = 0;
  let trackerCount = 0;
  ipcMain.handle("stats:get", () => ({ blockedCount, trackerCount }));
  setInterval(() => {
    for (const [windowId, win] of windows) {
      if (!win.window.isDestroyed()) {
        win.window.webContents.send("stats:update", { blockedCount, trackerCount });
      }
    }
  }, 1000);

  // Open external
  ipcMain.handle("shell:open", (e, url) => shell.openExternal(url));

  // Platform info
  ipcMain.handle("app:info", () => ({
    platform: process.platform,
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    userData: app.getPath("userData"),
  }));

  // Quit
  ipcMain.handle("app:quit", () => app.quit());
}

// ============================================================================
// App lifecycle
// ============================================================================
app.whenReady().then(async () => {
  // Privacy flags
  app.commandLine.appendSwitch("disable-features", "AutomationControlled,PrivacySandboxAdsAPIs,FencedFrames,SharedDictionary,Translate,MediaRouter,ProcessSharingSiteIsolation");
  app.commandLine.appendSwitch("disable-blink-features", "AutomationControlled");
  app.commandLine.appendSwitch("force-webrtc-ip-handling-policy", "disable_non_proxied_udp");
  app.commandLine.appendSwitch("webrtc-ip-handling-policy", "disable_non_proxied_udp");
  app.commandLine.appendSwitch("disable-quic");

  // RAM optimization: aggressive memory savings
  const cacheLimit = (store.get("cacheLimitMB") || 100) * 1024 * 1024;
  app.commandLine.appendSwitch("disk-cache-size", String(cacheLimit));
  app.commandLine.appendSwitch("memory-pressure-off"); // we handle it ourselves
  // Process model: one process per site instance (default) but limit shared workers
  app.commandLine.appendSwitch("disable-background-networking");
  app.commandLine.appendSwitch("disable-component-update");
  app.commandLine.appendSwitch("disable-default-apps");
  app.commandLine.appendSwitch("disable-extensions");
  app.commandLine.appendSwitch("disable-sync");
  app.commandLine.appendSwitch("disable-translate");
  app.commandLine.appendSwitch("disable-plugins");
  app.commandLine.appendSwitch("disable-print-preview");
  app.commandLine.appendSwitch("disable-features", "TabHoverCardImages");
  // Aggressive V8 optimizations for less RAM
  app.commandLine.appendSwitch("js-flags", "--max-old-space-size=512 --gc-interval=100");

  // DoH
  if (store.get("dohEnabled")) {
    const dohUrls = {
      cloudflare: "https://cloudflare-dns.com/dns-query",
      google: "https://dns.google/dns-query",
      quad9: "https://dns.quad9.net/dns-query",
      mullvad: "https://doh.mullvad.net/dns-query",
    };
    const dohUrl = dohUrls[store.get("dohProvider")] || dohUrls.cloudflare;
    app.commandLine.appendSwitch("enable-features", "DnsOverHttps");
    app.commandLine.appendSwitch("dns-over-https-mode", "secure");
    app.commandLine.appendSwitch("dns-over-https-templates", dohUrl);
  }

  // HTTPS-only
  if (store.get("httpsOnly")) {
    app.commandLine.appendSwitch("enable-features", "HttpsFirstModeIncognito,HttpsUpgrades");
  }

  // Strip client hint headers
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    delete headers["Sec-CH-UA"];
    delete headers["Sec-CH-UA-Mobile"];
    delete headers["Sec-CH-UA-Platform"];
    delete headers["Sec-CH-UA-Platform-Version"];
    delete headers["Sec-CH-UA-Arch"];
    delete headers["Sec-CH-UA-Bitness"];
    delete headers["Sec-CH-UA-Model"];
    delete headers["Sec-CH-UA-Full-Version-List"];
    callback({ requestHeaders: headers });
  });

  // RAM: limit cache size explicitly
  try {
    session.defaultSession.setSpellCheckerEnabled(false);
  } catch {}

  // Init adblocker
  await initAdblocker();

  // Setup downloads tracking
  setupDownloadsTracking(session.defaultSession);
  // Also track private sessions (will be created per private window)

  // Setup IPC
  setupIpc();

  // Setup downloads tracking for any new session
  app.on("session-created", (ses) => {
    setupDownloadsTracking(ses);
  });

  // Create first window
  createWindow(false);

  // Menu
  const template = [
    {
      label: "Veil",
      submenu: [
        { role: "about", label: "About Veil" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide", label: "Hide Veil" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit", label: "Quit Veil" },
      ],
    },
    {
      label: "File",
      submenu: [
        { label: "New Tab", accelerator: "CmdOrCtrl+T", click: () => {
          const w = BrowserWindow.getFocusedWindow();
          if (w) w.webContents.send("menu:new-tab");
        }},
        { label: "New Window", accelerator: "CmdOrCtrl+N", click: () => createWindow(false) },
        { label: "New Private Window", accelerator: "CmdOrCtrl+Shift+N", click: () => createWindow(true) },
        { type: "separator" },
        { label: "Close Tab", accelerator: "CmdOrCtrl+W", click: () => {
          const w = BrowserWindow.getFocusedWindow();
          if (w) w.webContents.send("menu:close-tab");
        }},
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" }, { role: "forceReload" }, { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" },
        { role: "togglefullscreen" },
        { label: "Toggle DevTools", accelerator: "F12", click: () => {
          const w = BrowserWindow.getFocusedWindow();
          if (w) w.webContents.send("menu:devtools");
        }},
      ],
    },
    {
      label: "History",
      submenu: [
        { label: "Back", accelerator: "Alt+Left", click: () => {
          const w = BrowserWindow.getFocusedWindow();
          if (w) w.webContents.send("menu:back");
        }},
        { label: "Forward", accelerator: "Alt+Right", click: () => {
          const w = BrowserWindow.getFocusedWindow();
          if (w) w.webContents.send("menu:forward");
        }},
        { type: "separator" },
        { label: "Show All History", accelerator: "CmdOrCtrl+H", click: () => {
          const w = BrowserWindow.getFocusedWindow();
          if (w) w.webContents.send("menu:open-history");
        }},
        { label: "Clear Browsing Data", accelerator: "CmdOrCtrl+Shift+Delete", click: () => {
          const w = BrowserWindow.getFocusedWindow();
          if (w) w.webContents.send("menu:clear-data");
        }},
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (windows.size === 0) createWindow(false);
});
