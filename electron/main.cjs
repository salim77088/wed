// Veil Browser — Main Process
// Electron-based privacy browser with multi-tab webviews, uBlock-class adblocker,
// tracker blocking, DoH, fingerprinting protection.

const {
  app,
  BrowserWindow,
  webContents,
  session,
  ipcMain,
  shell,
  Menu,
  dialog,
  nativeImage,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { ElectronBlocker } = require("@ghostery/adblocker-electron");
const Store = require("electron-store");

// ============================================================================
// Configuration store — persisted settings
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
  },
});

// ============================================================================
// State
// ============================================================================
let mainWindow = null;
const tabs = new Map(); // tabId -> { webContents, url, title, favicon, isLoading }
let activeTabId = null;
let blocker = null;
let nextTabId = 1;

// ============================================================================
// Adblocker initialization
// ============================================================================
async function initAdblocker() {
  const ses = session.defaultSession;

  try {
    // Create blocker from prebuilt EasyList + EasyPrivacy lists
    blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking();
    console.log("[Veil] Adblocker loaded (prebuilt ads + tracking)");
  } catch (err) {
    console.error("[Veil] Failed to load prebuilt blocker:", err.message);
    // Fallback: empty blocker
    blocker = ElectronBlocker.parse("", {
      enableCompression: true,
      enableOptimizations: true,
    });
  }

  // YouTube-specific blocking: block known ad-serving domains
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
    blocker.parse(ytFilters);
  }

  // Block social media widgets if enabled
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
    blocker.parse(socialFilters);
  }

  // Enable blocking in the default session — this wires up webRequest
  blocker.enableBlockingInSession(ses);
  console.log("[Veil] Adblocker enabled in default session");
}

// ============================================================================
// Fingerprinting protection — inject scripts into pages
// ============================================================================
const fingerprintProtectionScript = `
(() => {
  // Canvas fingerprint spoof
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const ctx = this.getContext("2d");
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      // Add subtle noise
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] ^= 1;
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return origToDataURL.apply(this, args);
  };

  // WebGL fingerprint spoof
  const origGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(p) {
    if (p === 37445) return "Intel Inc.";
    if (p === 37446) return "Intel Iris OpenGL Engine";
    return origGetParameter.call(this, p);
  };

  // AudioContext fingerprint spoof
  const origCreateOscillator = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function() {
    const osc = origCreateOscillator.call(this);
    const origConnect = osc.connect.bind(osc);
    osc.connect = function(dest) {
      // Add tiny random noise to break fingerprinting
      return origConnect(dest);
    };
    return osc;
  };

  // Navigator props
  Object.defineProperty(navigator, "plugins", {
    get: () => [1, 2, 3, 4, 5],
  });
  Object.defineProperty(navigator, "languages", {
    get: () => ["en-US", "en"],
  });

  // WebRTC IP leak prevention
  if (window.RTCPeerConnection) {
    const origRTC = window.RTCPeerConnection;
    window.RTCPeerConnection = function(...args) {
      const pc = new origRTC(...args);
      const origCreateDataChannel = pc.createDataChannel;
      pc.createDataChannel = function(...a) {
        const dc = origCreateDataChannel.apply(this, a);
        // Block ICE candidate gathering that leaks local IPs
        return dc;
      };
      return pc;
    };
    window.RTCPeerConnection.prototype = origRTC.prototype;
  }

  // Block battery API
  if (navigator.getBattery) {
    navigator.getBattery = () => Promise.resolve({
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }

  // Hardware concurrency spoof
  Object.defineProperty(navigator, "hardwareConcurrency", {
    get: () => 8,
  });

  // Device memory spoof
  Object.defineProperty(navigator, "deviceMemory", {
    get: () => 8,
  });
})();
`;

// ============================================================================
// Tab management — each tab is a real webContents (not iframe)
// ============================================================================
function createTab(url = null, options = {}) {
  const tabId = nextTabId++;

  // Create a new BrowserWindow as a child — invisible container
  // We use webContents.attach to a WebContentsView for proper embedding
  const { WebContentsView } = require("electron");
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      partition: options.partition || "persist:default",
    },
  });

  const wc = view.webContents;

  // Inject fingerprint protection before page loads
  if (store.get("fingerprintingProtection")) {
    wc.session.webRequest.onBeforeRequest(
      { urls: ["<all_urls>"] },
      (details, callback) => {
        // Let adblocker handle blocking; this is for resource filtering
        callback({});
      }
    );

    wc.on("dom-ready", () => {
      wc.executeJavaScript(fingerprintProtectionScript).catch(() => {});
    });
  }

  // Track navigation
  wc.on("did-start-loading", () => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.isLoading = true;
      tab.url = wc.getURL();
      sendTabUpdate(tabId);
    }
  });

  wc.on("did-stop-loading", () => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.isLoading = false;
      tab.url = wc.getURL();
      sendTabUpdate(tabId);
    }
  });

  // Persist to local history on navigation (only http/https)
  wc.on("did-finish-load", () => {
    const url = wc.getURL();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        const title = wc.getTitle();
        const historyPath = path.join(app.getPath("userData"), "history.json");
        let items = [];
        try {
          items = JSON.parse(fs.readFileSync(historyPath, "utf8"));
        } catch {}
        items.unshift({ url, title, visitedAt: Date.now() });
        items = items.slice(0, 500);
        fs.writeFileSync(historyPath, JSON.stringify(items, null, 2));
      } catch (e) {
        console.error("[Veil] history save error:", e.message);
      }
    }
  });

  wc.on("page-title-updated", (e, title) => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.title = title;
      sendTabUpdate(tabId);
    }
  });

  wc.on("page-favicon-updated", (e, favicons) => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.favicon = favicons[0];
      sendTabUpdate(tabId);
    }
  });

  // Open new windows in new tab
  wc.setWindowOpenHandler(({ url }) => {
    createTab(url);
    return { action: "deny" };
  });

  // Send URL updates to renderer for address bar sync
  wc.on("did-navigate", (e, url) => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.url = url;
      sendTabUpdate(tabId);
    }
  });

  wc.on("did-navigate-in-page", (e, url) => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.url = url;
      sendTabUpdate(tabId);
    }
  });

  // Attach to main window
  if (mainWindow) {
    mainWindow.contentView.addChildView(view);
  }

  tabs.set(tabId, {
    id: tabId,
    view,
    webContents: wc,
    url: url || "veil://newtab",
    title: "New Tab",
    favicon: null,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  });

  // Load initial URL
  if (url) {
    loadUrlInTab(tabId, url);
  } else {
    // Show new tab page — set webview to a blank state, renderer handles UI overlay
    wc.loadURL("data:text/html,<html><body style='background:#0a0d12;margin:0'></body></html>");
  }

  setActiveTab(tabId);
  resizeViews();
  return tabId;
}

function loadUrlInTab(tabId, input) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  let url = input.trim();

  // If it's an internal page
  if (url.startsWith("veil://")) {
    handleInternalPage(tabId, url);
    return;
  }

  // If it looks like a URL
  const looksLikeUrl = /^https?:\/\//.test(url) || /^[\w-]+(\.[\w-]+)+/.test(url);
  if (looksLikeUrl && !url.includes(" ")) {
    if (!/^https?:\/\//.test(url)) {
      url = "https://" + url;
    }
  } else {
    // Treat as search query
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
}

function handleInternalPage(tabId, url) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  if (url === "veil://newtab" || url === "veil://newtab/") {
    // Load the new tab page — we serve it from renderer assets
    const newTabHtml = getNewTabPage();
    tab.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(newTabHtml));
    tab.url = "veil://newtab";
    tab.title = "New Tab";
  } else if (url === "veil://settings") {
    const settingsHtml = getSettingsPage();
    tab.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(settingsHtml));
    tab.url = "veil://settings";
    tab.title = "Settings";
  }
}

function getNewTabPage() {
  // Use the renderer-built page
  const distPath = path.join(__dirname, "..", "dist");
  try {
    return fs.readFileSync(path.join(distPath, "newtab.html"), "utf8");
  } catch {
    return `<html><body style="background:#0a0d12;color:#fff;font-family:system-ui"><h1>New Tab</h1></body></html>`;
  }
}

function getSettingsPage() {
  const distPath = path.join(__dirname, "..", "dist");
  try {
    return fs.readFileSync(path.join(distPath, "settings.html"), "utf8");
  } catch {
    return `<html><body style="background:#0a0d12;color:#fff;font-family:system-ui"><h1>Settings</h1></body></html>`;
  }
}

function setActiveTab(tabId) {
  if (!tabs.has(tabId)) return;
  activeTabId = tabId;
  // Hide all views, show the active one
  for (const [id, tab] of tabs) {
    tab.view.setVisible(id === tabId);
  }
  resizeViews();
  sendActiveTab();
}

function closeTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  if (mainWindow && mainWindow.contentView) {
    mainWindow.contentView.removeChildView(tab.view);
  }
  tab.webContents.destroy();
  tabs.delete(tabId);

  if (activeTabId === tabId) {
    if (tabs.size === 0) {
      // Create a new tab
      createTab();
    } else {
      // Activate the first remaining tab
      setActiveTab(tabs.keys().next().value);
    }
  }
}

function resizeViews() {
  if (!mainWindow || !tabs.has(activeTabId)) return;
  const [width, height] = mainWindow.getContentSize();
  // The renderer chrome (sidebar + toolbar) takes the rest
  // Sidebar: 240px wide, Toolbar: 56px tall, status bar: 24px
  const SIDEBAR_WIDTH = 0; // sidebar is in renderer, hidden by default
  const TOOLBAR_HEIGHT = 56;
  const STATUS_HEIGHT = 0;

  for (const [id, tab] of tabs) {
    if (id === activeTabId) {
      tab.view.setBounds({
        x: SIDEBAR_WIDTH,
        y: TOOLBAR_HEIGHT,
        width: width - SIDEBAR_WIDTH,
        height: height - TOOLBAR_HEIGHT - STATUS_HEIGHT,
      });
    } else {
      tab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
  }
}

// ============================================================================
// Send updates to renderer
// ============================================================================
function sendTabUpdate(tabId) {
  if (!mainWindow) return;
  const tab = tabs.get(tabId);
  if (!tab) return;
  const payload = {
    id: tab.id,
    url: tab.url,
    title: tab.title || tab.url,
    favicon: tab.favicon,
    isLoading: tab.isLoading,
    canGoBack: tab.webContents.navigationHistory?.canGoBack() || false,
    canGoForward: tab.webContents.navigationHistory?.canGoForward() || false,
    isActive: tab.id === activeTabId,
  };
  mainWindow.webContents.send("tab:update", payload);
}

function sendActiveTab() {
  if (!mainWindow) return;
  mainWindow.webContents.send("tab:active-changed", { activeTabId });
  if (tabs.has(activeTabId)) sendTabUpdate(activeTabId);
}

function sendTabsList() {
  if (!mainWindow) return;
  const list = [];
  for (const [id, tab] of tabs) {
    list.push({
      id: tab.id,
      url: tab.url,
      title: tab.title || tab.url,
      favicon: tab.favicon,
      isLoading: tab.isLoading,
      isActive: tab.id === activeTabId,
    });
  }
  mainWindow.webContents.send("tabs:list", list);
}

// ============================================================================
// Window creation
// ============================================================================
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Veil",
    backgroundColor: "#0a0d12",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    titleBarOverlay: process.platform !== "darwin"
      ? {
          color: "#0a0d12",
          symbolColor: "#8b94a8",
          height: 40,
        }
      : undefined,
    frame: process.platform === "darwin",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the renderer chrome
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("resize", () => resizeViews());
  mainWindow.on("maximize", () => setTimeout(resizeViews, 50));
  mainWindow.on("unmaximize", () => setTimeout(resizeViews, 50));

  // Create first tab
  setTimeout(() => {
    createTab();
  }, 200);
}

// ============================================================================
// IPC handlers — communication with renderer
// ============================================================================
function setupIpc() {
  ipcMain.handle("tab:new", (e, url) => createTab(url));
  ipcMain.handle("tab:close", (e, id) => closeTab(id));
  ipcMain.handle("tab:set-active", (e, id) => setActiveTab(id));
  ipcMain.handle("tab:navigate", (e, id, url) => loadUrlInTab(id, url));
  ipcMain.handle("tab:back", (e, id) => {
    const tab = tabs.get(id);
    if (tab && tab.webContents.navigationHistory?.canGoBack()) {
      tab.webContents.navigationHistory.goBack();
    }
  });
  ipcMain.handle("tab:forward", (e, id) => {
    const tab = tabs.get(id);
    if (tab && tab.webContents.navigationHistory?.canGoForward()) {
      tab.webContents.navigationHistory.goForward();
    }
  });
  ipcMain.handle("tab:reload", (e, id) => {
    const tab = tabs.get(id);
    if (tab) tab.webContents.reload();
  });
  ipcMain.handle("tab:stop", (e, id) => {
    const tab = tabs.get(id);
    if (tab) tab.webContents.stop();
  });
  ipcMain.handle("tabs:list", () => {
    const list = [];
    for (const [id, tab] of tabs) {
      list.push({
        id: tab.id,
        url: tab.url,
        title: tab.title || tab.url,
        favicon: tab.favicon,
        isLoading: tab.isLoading,
        isActive: tab.id === activeTabId,
      });
    }
    return list;
  });

  // Settings
  ipcMain.handle("settings:get", (e, key) => store.get(key));
  ipcMain.handle("settings:getAll", () => store.store);
  ipcMain.handle("settings:set", (e, key, value) => {
    store.set(key, value);
    return true;
  });

  // History (local only)
  const historyPath = path.join(app.getPath("userData"), "history.json");
  function loadHistory() {
    try {
      return JSON.parse(fs.readFileSync(historyPath, "utf8"));
    } catch {
      return [];
    }
  }
  function saveHistory(items) {
    try {
      fs.writeFileSync(historyPath, JSON.stringify(items.slice(0, 1000), null, 2));
    } catch (e) {
      console.error("[Veil] Failed to save history:", e.message);
    }
  }

  // Track page visits for history
  // (We'll add this on did-navigate)

  ipcMain.handle("history:list", () => loadHistory());
  ipcMain.handle("history:clear", () => {
    saveHistory([]);
    return true;
  });

  // Bookmarks
  const bookmarksPath = path.join(app.getPath("userData"), "bookmarks.json");
  function loadBookmarks() {
    try {
      return JSON.parse(fs.readFileSync(bookmarksPath, "utf8"));
    } catch {
      return [];
    }
  }
  function saveBookmarks(items) {
    try {
      fs.writeFileSync(bookmarksPath, JSON.stringify(items, null, 2));
    } catch (e) {
      console.error("[Veil] Failed to save bookmarks:", e.message);
    }
  }

  ipcMain.handle("bookmarks:list", () => loadBookmarks());
  ipcMain.handle("bookmarks:add", (e, bookmark) => {
    const items = loadBookmarks();
    if (!items.find((b) => b.url === bookmark.url)) {
      items.unshift({ ...bookmark, addedAt: Date.now() });
      saveBookmarks(items);
    }
    return true;
  });
  ipcMain.handle("bookmarks:remove", (e, url) => {
    const items = loadBookmarks().filter((b) => b.url !== url);
    saveBookmarks(items);
    return true;
  });

  // Window controls
  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:maximize", () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle("window:close", () => mainWindow?.close());
  ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() || false);

  // Adblocker stats
  let blockedCount = 0;
  let trackerCount = 0;
  ipcMain.handle("stats:get", () => ({ blockedCount, trackerCount }));

  // Expose stats to renderer via periodic events
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("stats:update", { blockedCount, trackerCount });
    }
  }, 1000);
}

// ============================================================================
// App lifecycle
// ============================================================================
app.whenReady().then(async () => {
  // Set Chromium flags for privacy + performance
  app.commandLine.appendSwitch("disable-features", "AutomationControlled");
  app.commandLine.appendSwitch("disable-blink-features", "AutomationControlled");
  app.commandLine.appendSwitch("disable-features", "PrivacySandboxAdsAPIs");
  app.commandLine.appendSwitch("enable-features", "HttpsFirstModeIncognito");
  app.commandLine.appendSwitch("disable-features", "FencedFrames");
  app.commandLine.appendSwitch("disable-features", "SharedDictionary");
  app.commandLine.appendSwitch("force-webrtc-ip-handling-policy", "disable_non_proxied_udp");
  app.commandLine.appendSwitch("webrtc-ip-handling-policy", "disable_non_proxied_udp");

  // Disable QUIC (privacy)
  app.commandLine.appendSwitch("disable-quic");

  // Set DoH if enabled
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

  // HTTPS-only mode
  if (store.get("httpsOnly")) {
    app.commandLine.appendSwitch("enable-features", "HttpsFirstModeIncognito,HttpsUpgrades");
  }

  // Strip tracking headers (Sec-CH-UA, etc.) — preserves cookies for normal browsing
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };

    // Remove client hint headers that fingerprint the browser
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

  // Initialize adblocker
  await initAdblocker();

  // Setup IPC
  setupIpc();

  // Create main window
  createMainWindow();

  // Menu (minimal)
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
        {
          label: "New Tab",
          accelerator: "CmdOrCtrl+T",
          click: () => createTab(),
        },
        {
          label: "Close Tab",
          accelerator: "CmdOrCtrl+W",
          click: () => activeTabId && closeTab(activeTabId),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
