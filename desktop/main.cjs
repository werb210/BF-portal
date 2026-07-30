// BF_PORTAL_DESKTOP_SHELL_v1 - Electron main process for the macOS desktop build.
const { app, BrowserWindow, session, shell } = require("electron");

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

function isPortalUrl(url) {
  try { return new URL(url).origin === APP_ORIGIN; } catch { return false; }
}

function isSignInUrl(url) {
  try { return SIGN_IN_HOSTS.has(new URL(url).hostname); } catch { return false; }
}

function createWindow() {
  mainWindow = new BrowserWindow({
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

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
