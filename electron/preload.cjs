// Preload script — runs in isolated context, exposes safe APIs to renderer
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("veil", {
  // Tab operations
  tabs: {
    new: (url) => ipcRenderer.invoke("tab:new", url),
    close: (id) => ipcRenderer.invoke("tab:close", id),
    setActive: (id) => ipcRenderer.invoke("tab:set-active", id),
    navigate: (id, url) => ipcRenderer.invoke("tab:navigate", id, url),
    back: (id) => ipcRenderer.invoke("tab:back", id),
    forward: (id) => ipcRenderer.invoke("tab:forward", id),
    reload: (id) => ipcRenderer.invoke("tab:reload", id),
    stop: (id) => ipcRenderer.invoke("tab:stop", id),
    list: () => ipcRenderer.invoke("tabs:list"),
    onUpdate: (cb) => {
      ipcRenderer.on("tab:update", (_, data) => cb(data));
    },
    onActiveChanged: (cb) => {
      ipcRenderer.on("tab:active-changed", (_, data) => cb(data));
    },
    onListChanged: (cb) => {
      ipcRenderer.on("tabs:list", (_, data) => cb(data));
    },
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
  },

  // Bookmarks
  bookmarks: {
    list: () => ipcRenderer.invoke("bookmarks:list"),
    add: (b) => ipcRenderer.invoke("bookmarks:add", b),
    remove: (url) => ipcRenderer.invoke("bookmarks:remove", url),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  },

  // Stats
  stats: {
    get: () => ipcRenderer.invoke("stats:get"),
    onUpdate: (cb) => {
      ipcRenderer.on("stats:update", (_, data) => cb(data));
    },
  },
});
