// BF_PORTAL_DESKTOP_APP_v718 - Windows keeps the dialler connected in the tray,
// starts hidden at sign-in, runs once, and updates from GitHub releases.
const { app, BrowserWindow, session, shell, Tray, Menu, nativeImage, ipcMain, Notification } = require("electron");
const path = require("path");

const IS_WIN = process.platform === "win32";
// BF_PORTAL_DESKTOP_MAC_v723 - the Mac app keeps the dialler alive the same way:
// closing the window hides it (menu-bar icon to reopen or quit), it starts at login,
// and it runs once. Mac updates stay manual until the app is signed with Boreal's
// Apple Developer ID (macOS only lets signed apps update themselves).
const IS_MAC = process.platform === "darwin";
const KEEP_ALIVE = IS_WIN || IS_MAC;

const APP_URL = process.env.BOREAL_PORTAL_URL || "https://staff.boreal.financial";
const APP_ORIGIN = new URL(APP_URL).origin;
const SIGN_IN_HOSTS = new Set([
  "login.microsoftonline.com",
  "login.microsoft.com",
  "login.windows.net",
  "login.live.com",
]);
const GRANTED_PERMISSIONS = new Set([
  "media",
  "audioCapture",
  "clipboard-read",
  "clipboard-sanitized-write",
  "notifications",
]);

let mainWindow = null;
let tray = null;
let quitting = false;

if (KEEP_ALIVE && !app.requestSingleInstanceLock()) {
  app.quit();
} else if (KEEP_ALIVE) {
  app.on("second-instance", () => showWindow());
}

function showWindow() {
  if (!mainWindow) {
    createWindow(false);
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function isPortalUrl(url) {
  try { return new URL(url).origin === APP_ORIGIN; } catch { return false; }
}

function isSignInUrl(url) {
  try { return SIGN_IN_HOSTS.has(new URL(url).hostname); } catch { return false; }
}

function createWindow(startHidden = false) {
  mainWindow = new BrowserWindow({
    show: !startHidden,
    icon: IS_WIN ? path.join(__dirname, "icon.png") : undefined,
    autoHideMenuBar: IS_WIN,
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Boreal Staff Portal",
    backgroundColor: "#0B1F3A",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // BF_PORTAL_DESKTOP_ALERTS_v724 - incoming-call pop-up and unread badge bridge.
      preload: path.join(__dirname, "preload.cjs"),
      // Keep the dialler and ringtone active while the window is hidden.
      backgroundThrottling: false,
    },
  });

  void mainWindow.loadURL(APP_URL);

  // Microsoft sign-in opens a popup; everything else belongs in the browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isPortalUrl(url) || isSignInUrl(url)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isPortalUrl(url) || isSignInUrl(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  mainWindow.on("close", (event) => {
    if (KEEP_ALIVE && !quitting) { event.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  // BF_PORTAL_CALL_FAILS_VISIBLY_v752 - ask macOS for the microphone up front. Without this the first call can be
  // refused silently by macOS privacy settings, and the dialler can't place or answer calls.
  if (IS_MAC) {
    try {
      const { systemPreferences } = require("electron");
      if (systemPreferences.getMediaAccessStatus("microphone") !== "granted") void systemPreferences.askForMediaAccess("microphone");
    } catch { /* older Electron or no camera/mic subsystem: the portal still shows the mic error in the dialler */ }
  }
  // The dialer needs the microphone; nothing outside the portal gets anything.
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(isPortalUrl(contents.getURL()) && GRANTED_PERMISSIONS.has(permission));
  });
  session.defaultSession.setPermissionCheckHandler((contents, permission) => {
    const url = contents ? contents.getURL() : "";
    return isPortalUrl(url) && GRANTED_PERMISSIONS.has(permission);
  });

  if (IS_WIN) {
    app.setAppUserModelId("com.boreal.portal.desktop");
    app.setLoginItemSettings({ openAtLogin: true, args: ["--hidden"] });
    createWindow(process.argv.includes("--hidden"));

    const trayIcon = nativeImage.createFromPath(path.join(__dirname, "icon.png"));
    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    tray.setToolTip("Boreal Staff Portal - the dialler is on");
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: "Open Boreal Staff Portal", click: () => showWindow() },
      { type: "separator" },
      {
        label: "Quit (calls stop ringing on this PC)",
        click: () => { quitting = true; app.quit(); },
      },
    ]));
    tray.on("click", () => showWindow());

    // Download updates in the background and install on the next restart.
    const { autoUpdater } = require("electron-updater");
    const checkForUpdates = () => autoUpdater.checkForUpdatesAndNotify()
      .catch((error) => console.warn("update check failed", error && error.message));
    checkForUpdates();
    setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
  } else if (IS_MAC) {
    // BF_PORTAL_DESKTOP_MAC_v723 - start at login (hidden), menu-bar icon, dock click reopens.
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    const startHidden = app.getLoginItemSettings().wasOpenedAsHidden || process.argv.includes("--hidden");
    createWindow(startHidden);
    const barIcon = nativeImage.createFromPath(path.join(__dirname, "icon.png"));
    tray = new Tray(barIcon.isEmpty() ? barIcon : barIcon.resize({ width: 18, height: 18 }));
    tray.setToolTip("Boreal Staff Portal - the dialler is on");
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: "Open Boreal Staff Portal", click: () => showWindow() },
      { type: "separator" },
      { label: "Quit (calls stop ringing on this Mac)", click: () => { quitting = true; app.quit(); } },
    ]));
  } else {
    createWindow();
  }

  app.on("activate", () => {
    if (KEEP_ALIVE) { showWindow(); return; }
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => { quitting = true; });

app.on("window-all-closed", () => {
  if (!KEEP_ALIVE) app.quit();
});

// BF_PORTAL_DESKTOP_ALERTS_v724 - an incoming call brings the window to the front with
// a pop-up naming the caller; the unread count shows on the taskbar (Windows: red dot
// and tray tooltip) or the Dock (Mac: number badge). Only the portal page may ask.
const BADGE_DOT = nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWElEQVR4nGNgoBAw4pK4o6b2H5mvcusWVrUYguga0QG6QUykaMamhgmXBLGGMOFTSAxgItV2dFdQxwUDbwCuRIIPwPRQzwukuAJZLRMuCWI0MzBQITNRDACMliQa+qnBwQAAAABJRU5ErkJggg==");
let callNote = null;

ipcMain.on("boreal:incoming-call", (event, info) => {
  if (!isPortalUrl(event.sender.getURL())) return;
  showWindow();
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(true);
    setTimeout(() => { if (mainWindow) mainWindow.setAlwaysOnTop(false); }, 4000);
    if (IS_WIN) mainWindow.flashFrame(true);
  }
  if (Notification.isSupported()) {
    if (callNote) callNote.close();
    callNote = new Notification({ title: "Incoming call: " + (info && info.name ? info.name : "Unknown caller"), body: info && info.detail ? info.detail : "Answer in Boreal Staff Portal", silent: true });
    callNote.on("click", () => showWindow());
    callNote.show();
  }
});

ipcMain.on("boreal:badge", (event, count) => {
  if (!isPortalUrl(event.sender.getURL())) return;
  const n = Math.max(0, Math.min(999, Number(count) || 0));
  if (IS_MAC) app.setBadgeCount(n);
  if (IS_WIN && mainWindow) mainWindow.setOverlayIcon(n > 0 ? BADGE_DOT : null, n > 0 ? n + " unread" : "");
  if (tray) tray.setToolTip("Boreal Staff Portal" + (n > 0 ? " - " + n + " unread" : " - the dialler is on"));
});
