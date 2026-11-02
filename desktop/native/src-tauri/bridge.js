// BF_PORTAL_v876_NATIVE_DESKTOP - runs in the app's main window before any page script (Tauri initialization script).
// It is the same small bridge desktop/preload.cjs gave the Electron app, plus what a system webview needs:
//   window.borealDesktop.incomingCall({ name, detail }) and .setBadge(count) - the portal's DesktopBridge calls these;
//   window.Notification - WKWebView has none and WebView2 would ask again; notifications become native ones;
//   the portal's old offline cache (service workers, Cache Storage) is removed once per launch;
//   links to other sites open in the default browser;
//   macOS is asked for the microphone when the portal first loads, so the first call is not refused silently.
// Only the portal gets the bridge: the app's own start page, Microsoft sign-in and embedded pages do not.
// The app itself checks every call comes from the portal, so a page cannot use it by pretending.
(function () {
  "use strict";
  var loc = window.location;
  var host = loc.hostname || "";
  if (loc.protocol !== "https:" || host === "tauri.localhost") return;
  var notPortal = [
    /(^|\.)login\.microsoftonline\.com$/, /(^|\.)login\.microsoft\.com$/, /(^|\.)login\.windows\.net$/, /(^|\.)login\.live\.com$/,
    /(^|\.)signnow\.com$/, /(^|\.)sharepoint\.com$/, /(^|\.)officeapps\.live\.com$/, /(^|\.)onedrive\.live\.com$/,
  ];
  for (var i = 0; i < notPortal.length; i++) if (notPortal[i].test(host)) return;

  function invoke(cmd, args) {
    try {
      var t = window.__TAURI_INTERNALS__;
      if (t && typeof t.invoke === "function") return Promise.resolve(t.invoke(cmd, args || {})).catch(function () {});
    } catch (_) { /* not inside the app */ }
    return Promise.resolve();
  }
  function text(v, max) { return String(v == null ? "" : v).slice(0, max); }
  function count(v) { var n = Math.floor(Number(v) || 0); return Math.max(0, Math.min(999, n)); }

  var api = {
    native: true,
    platform: /Mac/i.test(navigator.platform || navigator.userAgent) ? "mac" : "windows",
    findsCompany: window.__DESKTOP_FINDS_COMPANY__ === true,
    incomingCall: function (info) {
      invoke("incoming_call", { name: text(info && info.name, 120), detail: text(info && info.detail, 160) });
    },
    setBadge: function (n) { invoke("set_badge", { count: count(n) }); },
  };
  try {
    Object.defineProperty(window, "borealDesktop", { value: Object.freeze(api), configurable: false, writable: false });
  } catch (_) {
    window.borealDesktop = api;
  }

  // Native notifications for `new Notification(title, { body })`.
  function DesktopNotification(title, options) {
    this.title = text(title, 120);
    this.body = text(options && options.body, 300);
    this.tag = options && options.tag ? String(options.tag) : "";
    this.onclick = null;
    this.onclose = null;
    this.onshow = null;
    this.onerror = null;
    invoke("notify", { title: this.title, body: this.body });
  }
  DesktopNotification.permission = "granted";
  DesktopNotification.requestPermission = function (cb) {
    if (typeof cb === "function") cb("granted");
    return Promise.resolve("granted");
  };
  DesktopNotification.prototype.close = function () {};
  DesktopNotification.prototype.addEventListener = function () {};
  DesktopNotification.prototype.removeEventListener = function () {};
  try { window.Notification = DesktopNotification; } catch (_) { /* read-only in this webview */ }

  // The offline cache only ever pinned an old build in the desktop app; clear it once per launch, keep sign-in.
  try {
    if (!window.sessionStorage.getItem("desktop.cacheCleared")) {
      window.sessionStorage.setItem("desktop.cacheCleared", "1");
      var jobs = [];
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        }));
      }
      if (window.caches && window.caches.keys) {
        jobs.push(window.caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) { return window.caches.delete(k); }));
        }));
      }
      Promise.all(jobs).then(function () {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) loc.reload();
      }).catch(function (err) { console.warn("[desktop] could not clear the old portal cache", err); });
    }
  } catch (_) { /* storage unavailable: nothing cached either */ }

  // Links to other sites open in the browser (after the portal's own click handlers had their say).
  window.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    var el = e.target;
    while (el && el.nodeType === 1 && el.tagName !== "A") el = el.parentNode;
    if (!el || el.nodeType !== 1 || !el.href || el.hasAttribute("download")) return;
    var url;
    try { url = new URL(el.href, loc.href); } catch (_) { return; }
    if (!/^(https?|mailto):$/.test(url.protocol) || url.origin === loc.origin) return;
    e.preventDefault();
    invoke("open_external", { url: url.href });
  }, false);

  // Ask macOS for the microphone now, not on the first call.
  if (api.platform === "mac") {
    window.addEventListener("load", function () {
      try {
        var md = navigator.mediaDevices;
        if (!md || !md.getUserMedia || window.localStorage.getItem("desktop.micAsked")) return;
        var ask = function () {
          md.getUserMedia({ audio: true }).then(function (stream) {
            try { window.localStorage.setItem("desktop.micAsked", "1"); } catch (_) { /* asks again next launch */ }
            stream.getTracks().forEach(function (t) { t.stop(); });
          }).catch(function () { /* the dialler shows its own microphone message */ });
        };
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: "microphone" }).then(function (s) { if (s.state === "prompt") ask(); }).catch(ask);
        } else {
          ask();
        }
      } catch (_) { /* no microphone support */ }
    });
  }
})();
