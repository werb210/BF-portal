// BF_PORTAL_DESKTOP_ALERTS_v724 - the only bridge between the portal page and the
// desktop app: two calls, no Node access for the page.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("borealDesktop", {
  incomingCall: (info) => ipcRenderer.send("boreal:incoming-call", { name: String(info?.name ?? "").slice(0, 120), detail: String(info?.detail ?? "").slice(0, 160) }),
  setBadge: (count) => ipcRenderer.send("boreal:badge", Math.max(0, Math.min(999, Number(count) || 0))),
});
