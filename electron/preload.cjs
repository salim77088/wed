// Preload script — exposes safe APIs to renderer via contextBridge
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("veil", {
  // Platform / app info
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  app: {
    info: () => ipcRenderer.invoke("app:info"),
    quit: () => ipcRenderer.invoke("app:quit"),
  },

  // Windows
  windows: {
    new: (isPrivate) => ipcRenderer.invoke("window:new", isPrivate),
    close: (windowId) => ipcRenderer.invoke("window:close", windowId),
    minimize: (windowId) => ipcRenderer.invoke("window:minimize", windowId),
    maximize: (windowId) => ipcRenderer.invoke("window:maximize", windowId),
    isMaximized: (windowId) => ipcRenderer.invoke("window:is-maximized", windowId),
  },

  // Tabs
  tabs: {
    new: (windowId, url) => ipcRenderer.invoke("tab:new", windowId, url),
    close: (windowId, id) => ipcRenderer.invoke("tab:close", windowId, id),
    setActive: (windowId, id) => ipcRenderer.invoke("tab:set-active", windowId, id),
    navigate: (windowId, id, url) => ipcRenderer.invoke("tab:navigate", windowId, id, url),
    back: (windowId, id) => ipcRenderer.invoke("tab:back", windowId, id),
    forward: (windowId, id) => ipcRenderer.invoke("tab:forward", windowId, id),
    reload: (windowId, id, bypassCache) => ipcRenderer.invoke("tab:reload", windowId, id, bypassCache),
    stop: (windowId, id) => ipcRenderer.invoke("tab:stop", windowId, id),
    list: (windowId) => ipcRenderer.invoke("tabs:list", windowId),
    print: (windowId, id) => ipcRenderer.invoke("tab:print", windowId, id),
    zoom: (windowId, id, delta, reset) => ipcRenderer.invoke("tab:zoom", windowId, id, delta, reset),
    find: (windowId, id, query) => ipcRenderer.invoke("tab:find", windowId, id, query),
    findStop: (windowId, id) => ipcRenderer.invoke("tab:find-stop", windowId, id),
    savePage: (windowId, id) => ipcRenderer.invoke("tab:save-page", windowId, id),
    share: (windowId, id) => ipcRenderer.invoke("tab:share", windowId, id),
    devtools: (windowId, id) => ipcRenderer.invoke("tab:devtools", windowId, id),
  },

  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke("settings:get", key),
    getAll: () => ipcRenderer.invoke("settings:getAll"),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  },

  // History
  history: {
    list: () => ipcRenderer.invoke("history:list"),
    clear: () => ipcRenderer.invoke("history:clear"),
    remove: (url) => ipcRenderer.invoke("history:remove", url),
  },

  // Bookmarks
  bookmarks: {
    list: () => ipcRenderer.invoke("bookmarks:list"),
    add: (b) => ipcRenderer.invoke("bookmarks:add", b),
    remove: (url) => ipcRenderer.invoke("bookmarks:remove", url),
  },

  // Downloads
  downloads: {
    list: () => ipcRenderer.invoke("downloads:list"),
    clear: () => ipcRenderer.invoke("downloads:clear"),
    open: (path) => ipcRenderer.invoke("downloads:open", path),
    show: (path) => ipcRenderer.invoke("downloads:show", path),
    onUpdated: (cb) => ipcRenderer.on("downloads:updated", (_, data) => cb(data)),
  },

  // Clear browsing data
  data: {
    clear: (opts) => ipcRenderer.invoke("data:clear", opts),
  },

  // Stats
  stats: {
    get: () => ipcRenderer.invoke("stats:get"),
    onUpdate: (cb) => ipcRenderer.on("stats:update", (_, data) => cb(data)),
  },

  // Shell
  shell: {
    open: (url) => ipcRenderer.invoke("shell:open", url),
  },

  // Event listeners — renderer subscribes to events from main
  on: (channel, cb) => {
    const valid = [
      "tab:update",
      "tab:active-changed",
      "tabs:list",
      "window:init",
      "find:toggle",
      "downloads:toggle",
      "downloads:updated",
      "zoom:changed",
      "stats:update",
      "menu:new-tab",
      "menu:close-tab",
      "menu:back",
      "menu:forward",
      "menu:devtools",
      "menu:open-history",
      "menu:clear-data",
      "data:clear-dialog",
    ];
    if (valid.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => cb(data));
    }
  },
});
