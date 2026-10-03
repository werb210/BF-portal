// BF_PORTAL_DESKTOP_APP_v718 - Windows keeps the dialler connected in the tray,
// starts hidden at sign-in, runs once, and updates from GitHub releases.
const { app, BrowserWindow, session, shell, Tray, Menu, nativeImage } = require("electron");
const path = require("path");

const IS_WIN = process.platform === "win32";

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

if (IS_WIN && !app.requestSingleInstanceLock()) {
  app.quit();
} else if (IS_WIN) {
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
    if (IS_WIN && !quitting) { event.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
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
  } else {
    createWindow();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => { quitting = true; });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !IS_WIN) app.quit();
});
