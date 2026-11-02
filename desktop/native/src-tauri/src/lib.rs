// BF_PORTAL_v876_NATIVE_DESKTOP - the native staff-portal app for macOS (WKWebView) and Windows (WebView2), replacing the
// Electron shell in desktop/. Being a real signed app is what makes passkeys (Touch ID / iCloud Keychain through the
// Associated Domains entitlement, Windows Hello through WebView2's WebAuthn) and the macOS "From Messages" code AutoFill
// work. Everything the Electron app did is kept (desktop/main.cjs and preload.cjs):
//   - loads the live portal (not a bundled copy); one app instance; start at login, hidden; closing the window hides
//     it to the tray / menu bar so the dialler stays connected and calls ring; Quit from the tray menu really quits;
//   - Microsoft sign-in pop-ups stay in the app, every other link opens in the default browser;
//   - the microphone, clipboard and notifications are granted to the portal and nothing else; macOS is asked for the
//     microphone up front (bridge.js) so the first call is not refused silently;
//   - the portal's old offline cache (service workers, Cache Storage) is cleared on every launch, sign-in is kept;
//   - window.borealDesktop.incomingCall / setBadge: an incoming call brings the window to the front for 4 seconds
//     with a notification naming the caller; the unread count goes on the Dock (Mac) or taskbar (Windows dot) and in
//     the tray tooltip; web notifications become native ones;
//   - updates download in the background from GitHub Releases and install on Quit, on "Restart to update", or
//     straight away when the app was started at sign-in (nobody is on a call yet). Mac updates now work too: the
//     app is signed with the Developer ID.
// The brand (name, portal address) is src-tauri/brand.json, written by desktop/native/brand.mjs at build time.
// An empty portal_url makes the app ask for a work email or mobile number first and find the company the same way
// a staff-directory lookup does (ops_url), then remember it ("Change company" in the tray resets it).
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicU32, Ordering},
        Mutex,
    },
    time::Duration,
};

use serde::{Deserialize, Serialize};
#[cfg(target_os = "windows")]
use tauri::image::Image;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    utils::config::BackgroundThrottlingPolicy,
    webview::{DownloadEvent, NewWindowResponse, PermissionKind, PermissionResponse},
    AppHandle, Manager, RunEvent, Url, Webview, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartExt};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::{Update, UpdaterExt};

const BRAND_JSON: &str = include_str!("../brand.json");
const BRIDGE_JS: &str = include_str!("../bridge.js");
#[cfg(target_os = "windows")]
const BADGE_DOT_PNG: &[u8] = include_bytes!("../icons/badge-dot.png");
const MAIN: &str = "main";
const UPDATE_EVERY: Duration = Duration::from_secs(6 * 60 * 60);

/// Microsoft sign-in (Office 365 connect) runs in a pop-up inside the app.
const SIGN_IN_HOSTS: &[&str] = &[
    "login.microsoftonline.com",
    "login.microsoft.com",
    "login.windows.net",
    "login.live.com",
];

/// Pages the portal shows inside frames (e-signing, Office/SharePoint previews). macOS asks the navigation handler
/// about frames too, so these must not be pushed out to the browser.
const EMBED_HOST_SUFFIXES: &[&str] = &[
    "signnow.com",
    "sharepoint.com",
    "officeapps.live.com",
    "onedrive.live.com",
    "azurestaticapps.net",
];

#[derive(Deserialize, Clone)]
struct Brand {
    app_name: String,
    #[serde(default)]
    portal_url: String,
    #[serde(default)]
    ops_url: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct Workspace {
    name: String,
    portal_url: String,
}

struct Shell {
    brand: Brand,
    /// The portal this app shows: brand.portal_url, or the company chosen on this computer.
    portal: Mutex<Option<Url>>,
    quitting: AtomicBool,
    started_hidden: bool,
    popups: AtomicU32,
    pending_update: Mutex<Option<(Update, Vec<u8>)>>,
    update_item: Mutex<Option<MenuItem<tauri::Wry>>>,
}

impl Shell {
    fn finds_company(&self) -> bool {
        self.brand.portal_url.trim().is_empty()
    }
    fn portal(&self) -> Option<Url> {
        self.portal.lock().ok().and_then(|p| p.clone())
    }
}

fn shell(app: &AppHandle) -> tauri::State<'_, Shell> {
    app.state::<Shell>()
}

fn https_origin(raw: &str) -> Option<Url> {
    let url = Url::parse(raw.trim()).ok()?;
    if url.scheme() != "https" || url.host_str().is_none() {
        return None;
    }
    Url::parse(&url.origin().ascii_serialization()).ok()
}

fn is_portal(app: &AppHandle, url: &Url) -> bool {
    match shell(app).portal() {
        Some(portal) => url.origin() == portal.origin(),
        None => false,
    }
}

fn is_sign_in(url: &Url) -> bool {
    url.scheme() == "https"
        && url
            .host_str()
            .map(|h| SIGN_IN_HOSTS.contains(&h))
            .unwrap_or(false)
}

fn is_embed(url: &Url) -> bool {
    url.scheme() == "https"
        && url
            .host_str()
            .map(|h| {
                EMBED_HOST_SUFFIXES
                    .iter()
                    .any(|s| h == *s || h.ends_with(&format!(".{s}")))
            })
            .unwrap_or(false)
}

/// The app's own start page (tauri://localhost on macOS, http(s)://tauri.localhost on Windows).
fn is_local(url: &Url) -> bool {
    url.scheme() == "tauri" || url.host_str() == Some("tauri.localhost")
}

fn is_inert(url: &Url) -> bool {
    matches!(url.scheme(), "about" | "data" | "blob")
}

fn open_outside(app: &AppHandle, url: &Url) {
    if matches!(url.scheme(), "http" | "https" | "mailto" | "tel" | "sms") {
        if let Err(err) = app.opener().open_url(url.as_str(), None::<&str>) {
            eprintln!("[desktop] could not open {url} in the browser: {err}");
        }
    }
}

/// Electron's will-navigate rule: the portal, Microsoft sign-in and the app's own page stay; everything else goes to
/// the default browser.
fn allow_navigation(app: &AppHandle, url: &Url) -> bool {
    if is_inert(url) || is_local(url) || is_portal(app, url) || is_sign_in(url) || is_embed(url) {
        return true;
    }
    open_outside(app, url);
    false
}

fn show_main(app: &AppHandle) {
    match app.get_webview_window(MAIN) {
        Some(window) => {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
        None => {
            if let Err(err) = build_main(app, false) {
                eprintln!("[desktop] could not open the window: {err}");
            }
        }
    }
}

fn workspace_file(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|d| d.join("workspace.json"))
}

fn load_workspace(app: &AppHandle) -> Option<Url> {
    let raw = std::fs::read_to_string(workspace_file(app)?).ok()?;
    let ws: Workspace = serde_json::from_str(&raw).ok()?;
    https_origin(&ws.portal_url)
}

fn save_workspace(app: &AppHandle, ws: Option<&Workspace>) -> Result<(), String> {
    let path = workspace_file(app).ok_or("no settings folder")?;
    match ws {
        Some(ws) => {
            if let Some(dir) = path.parent() {
                std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
            }
            std::fs::write(&path, serde_json::to_vec(ws).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())
        }
        None => match std::fs::remove_file(&path) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        },
    }
}

fn unique_download_path(dir: PathBuf, suggested: &str) -> PathBuf {
    let name = suggested
        .rsplit(['/', '\\'])
        .next()
        .filter(|n| !n.trim().is_empty())
        .unwrap_or("download")
        .to_string();
    let first = dir.join(&name);
    if !first.exists() {
        return first;
    }
    let (stem, ext) = match name.rfind('.') {
        Some(i) if i > 0 => (name[..i].to_string(), name[i..].to_string()),
        _ => (name.clone(), String::new()),
    };
    (1..1000)
        .map(|n| dir.join(format!("{stem} ({n}){ext}")))
        .find(|p| !p.exists())
        .unwrap_or(first)
}

fn build_main(app: &AppHandle, hidden: bool) -> tauri::Result<WebviewWindow> {
    let state = shell(app);
    let portal = state.portal();
    let url = match &portal {
        Some(p) => WebviewUrl::External(p.clone()),
        None => WebviewUrl::App("index.html".into()),
    };
    let script = format!(
        "window.__DESKTOP_FINDS_COMPANY__ = {};\n{}",
        state.finds_company(),
        BRIDGE_JS
    );
    let title = state.brand.app_name.clone();
    drop(state);

    let nav_app = app.clone();
    let popup_app = app.clone();
    let perm_app = app.clone();
    let download_app = app.clone();
    WebviewWindowBuilder::new(app, MAIN, url)
        .title(&title)
        .inner_size(1440.0, 900.0)
        .min_inner_size(1024.0, 700.0)
        .background_color(tauri::webview::Color(11, 31, 58, 255))
        .visible(!hidden)
        // Keep the dialler and its ringtone running while the window is hidden (Electron: backgroundThrottling false).
        .background_throttling(BackgroundThrottlingPolicy::Disabled)
        .initialization_script(&script)
        .on_navigation(move |url| allow_navigation(&nav_app, url))
        .on_new_window(move |url, features| {
            if is_inert(&url) || is_portal(&popup_app, &url) || is_sign_in(&url) {
                let n = shell(&popup_app).popups.fetch_add(1, Ordering::SeqCst);
                let nav = popup_app.clone();
                let built = WebviewWindowBuilder::new(
                    &popup_app,
                    format!("popup-{n}"),
                    WebviewUrl::External("about:blank".parse().expect("about:blank")),
                )
                .window_features(features)
                .title(&title)
                .on_navigation(move |u| allow_navigation(&nav, u))
                .build();
                match built {
                    Ok(window) => NewWindowResponse::Create { window },
                    Err(err) => {
                        eprintln!("[desktop] could not open the sign-in window: {err}");
                        NewWindowResponse::Deny
                    }
                }
            } else {
                open_outside(&popup_app, &url);
                NewWindowResponse::Deny
            }
        })
        .on_permission_request(move |webview: Webview, kind| {
            let from_portal = webview
                .url()
                .map(|u| is_portal(&perm_app, &u))
                .unwrap_or(false);
            match kind {
                PermissionKind::Microphone
                | PermissionKind::ClipboardRead
                | PermissionKind::Notifications
                    if from_portal =>
                {
                    PermissionResponse::Allow
                }
                _ => PermissionResponse::Deny,
            }
        })
        .on_download(move |_webview, event| {
            match event {
                DownloadEvent::Requested { url, destination } => {
                    let suggested = destination
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .or_else(|| {
                            url.path_segments()
                                .and_then(|mut s| s.next_back().map(str::to_string))
                        })
                        .unwrap_or_default();
                    if let Ok(dir) = download_app.path().download_dir() {
                        *destination = unique_download_path(dir, &suggested);
                    }
                }
                DownloadEvent::Finished { success, .. } => {
                    let body = if success {
                        "Saved to your Downloads folder."
                    } else {
                        "The download did not finish."
                    };
                    notify_native(&download_app, "Download", body);
                }
                _ => {}
            }
            true
        })
        .build()
}

/// The app's own start page ("find your company"), as the webview addresses it on each platform.
fn start_page() -> Url {
    let raw = if cfg!(target_os = "windows") {
        "http://tauri.localhost/index.html"
    } else {
        "tauri://localhost/index.html"
    };
    Url::parse(raw).expect("start page url")
}

/// Shows `url` in the main window (opening it if needed).
fn open_in_main(app: &AppHandle, url: Url) {
    match app.get_webview_window(MAIN) {
        Some(window) => {
            if let Err(err) = window.navigate(url) {
                eprintln!("[desktop] could not open the page: {err}");
            }
            let _ = window.show();
            let _ = window.set_focus();
        }
        None => show_main(app),
    }
}

fn notify_native(app: &AppHandle, title: &str, body: &str) {
    if let Err(err) = app.notification().builder().title(title).body(body).show() {
        eprintln!("[desktop] notification failed: {err}");
    }
}

fn from_portal(app: &AppHandle, webview: &Webview) -> bool {
    webview.url().map(|u| is_portal(app, &u)).unwrap_or(false)
}

fn clip(s: &str, max: usize) -> String {
    s.trim().chars().take(max).collect()
}

/// window.borealDesktop.incomingCall({ name, detail })
#[tauri::command]
fn incoming_call(
    app: AppHandle,
    webview: Webview,
    name: String,
    detail: String,
) -> Result<(), String> {
    if !from_portal(&app, &webview) {
        return Err("not_allowed".into());
    }
    show_main(&app);
    if let Some(window) = app.get_webview_window(MAIN) {
        let _ = window.set_always_on_top(true);
        let later = window.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(4));
            let _ = later.set_always_on_top(false);
        });
        #[cfg(target_os = "windows")]
        let _ = window.request_user_attention(Some(tauri::UserAttentionType::Informational));
    }
    let name = clip(&name, 120);
    let detail = clip(&detail, 160);
    let app_name = shell(&app).brand.app_name.clone();
    let title = format!(
        "Incoming call: {}",
        if name.is_empty() {
            "Unknown caller"
        } else {
            name.as_str()
        }
    );
    let body = if detail.is_empty() {
        format!("Answer in {app_name}")
    } else {
        detail
    };
    notify_native(&app, &title, &body);
    Ok(())
}

fn tray_tooltip(app: &AppHandle, unread: i64) -> String {
    let name = shell(app).brand.app_name.clone();
    if unread > 0 {
        format!("{name} - {unread} unread")
    } else {
        format!("{name} - the dialler is on")
    }
}

/// window.borealDesktop.setBadge(count)
#[tauri::command]
fn set_badge(app: AppHandle, webview: Webview, count: i64) -> Result<(), String> {
    if !from_portal(&app, &webview) {
        return Err("not_allowed".into());
    }
    let n = count.clamp(0, 999);
    if let Some(window) = app.get_webview_window(MAIN) {
        #[cfg(target_os = "macos")]
        let _ = window.set_badge_count(if n > 0 { Some(n) } else { None });
        #[cfg(target_os = "windows")]
        {
            let dot = if n > 0 {
                Image::from_bytes(BADGE_DOT_PNG).ok()
            } else {
                None
            };
            let _ = window.set_overlay_icon(dot);
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        let _ = &window;
    }
    if let Some(tray) = app.tray_by_id(MAIN) {
        let _ = tray.set_tooltip(Some(tray_tooltip(&app, n)));
    }
    Ok(())
}

/// The portal's `new Notification(title, { body })` (bridge.js), shown as a native notification.
#[tauri::command]
fn notify(app: AppHandle, webview: Webview, title: String, body: String) -> Result<(), String> {
    if !from_portal(&app, &webview) {
        return Err("not_allowed".into());
    }
    let app_name = shell(&app).brand.app_name.clone();
    let title = clip(&title, 120);
    notify_native(
        &app,
        if title.is_empty() { &app_name } else { &title },
        &clip(&body, 300),
    );
    Ok(())
}

/// A link the portal opens outside the app (bridge.js routes external <a> clicks here).
#[tauri::command]
fn open_external(app: AppHandle, webview: Webview, url: String) -> Result<(), String> {
    if !from_portal(&app, &webview) {
        return Err("not_allowed".into());
    }
    let url = Url::parse(&url).map_err(|_| "bad_url".to_string())?;
    if !matches!(url.scheme(), "http" | "https" | "mailto") {
        return Err("bad_url".into());
    }
    open_outside(&app, &url);
    Ok(())
}

#[derive(Serialize)]
struct Company {
    name: String,
    portal_url: String,
}

#[derive(Deserialize)]
struct LookupMatch {
    #[serde(default)]
    name: String,
    #[serde(default)]
    server_url: String,
}

#[derive(Deserialize)]
struct LookupBody {
    #[serde(default)]
    matches: Vec<LookupMatch>,
}

/// Find the company for a work email or mobile number - a staff-directory lookup:
/// POST {ops}/api/staff-directory/lookup gives the brokerage's server, and the server's public
/// GET /api/licensee gives its staff-portal address. Runs here, not in the page, so no CORS rules apply.
#[tauri::command]
async fn find_company(app: AppHandle, identifier: String) -> Result<Vec<Company>, String> {
    let ops = shell(&app)
        .brand
        .ops_url
        .trim()
        .trim_end_matches('/')
        .to_string();
    if https_origin(&ops).is_none() {
        return Err("unavailable".into());
    }
    let identifier = clip(&identifier, 200);
    if identifier.is_empty() {
        return Ok(vec![]);
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|_| "unavailable".to_string())?;
    let res = client
        .post(format!("{ops}/api/staff-directory/lookup"))
        .json(&serde_json::json!({ "identifier": identifier }))
        .send()
        .await
        .map_err(|_| "unavailable".to_string())?;
    if res.status().as_u16() == 429 {
        return Err("rate_limited".into());
    }
    if !res.status().is_success() {
        return Err("unavailable".into());
    }
    let body: LookupBody = res.json().await.map_err(|_| "unavailable".to_string())?;
    let mut out: Vec<Company> = Vec::new();
    for m in body.matches {
        let Some(server) = https_origin(&m.server_url) else {
            continue;
        };
        let server = server.as_str().trim_end_matches('/').to_string();
        let Ok(resp) = client.get(format!("{server}/api/licensee")).send().await else {
            continue;
        };
        if !resp.status().is_success() {
            continue;
        }
        let Ok(json) = resp.json::<serde_json::Value>().await else {
            continue;
        };
        let portal = json
            .pointer("/licensee/urls/portal")
            .and_then(|v| v.as_str())
            .and_then(https_origin);
        if let Some(portal) = portal {
            let name = if m.name.trim().is_empty() {
                portal.host_str().unwrap_or_default().to_string()
            } else {
                clip(&m.name, 80)
            };
            let portal_url = portal.as_str().trim_end_matches('/').to_string();
            if !out.iter().any(|c| c.portal_url == portal_url) {
                out.push(Company { name, portal_url });
            }
        }
    }
    Ok(out)
}

/// Remembers the chosen company on this computer and opens its portal.
#[tauri::command]
async fn choose_company(app: AppHandle, name: String, portal_url: String) -> Result<(), String> {
    if !shell(&app).finds_company() {
        return Err("fixed_portal".into());
    }
    let portal = https_origin(&portal_url).ok_or("bad_url")?;
    save_workspace(
        &app,
        Some(&Workspace {
            name: clip(&name, 80),
            portal_url: portal.to_string(),
        }),
    )?;
    if let Ok(mut p) = shell(&app).portal.lock() {
        *p = Some(portal.clone());
    }
    open_in_main(&app, portal);
    Ok(())
}

fn change_company(app: &AppHandle) {
    if let Err(err) = save_workspace(app, None) {
        eprintln!("[desktop] could not forget the company: {err}");
    }
    if let Ok(mut p) = shell(app).portal.lock() {
        *p = None;
    }
    open_in_main(app, start_page());
}

fn install_pending_update(app: &AppHandle) -> bool {
    let pending = shell(app)
        .pending_update
        .lock()
        .ok()
        .and_then(|mut p| p.take());
    match pending {
        Some((update, bytes)) => match update.install(bytes) {
            Ok(()) => true,
            Err(err) => {
                eprintln!("[desktop] update install failed: {err}");
                false
            }
        },
        None => false,
    }
}

fn quit(app: &AppHandle) {
    shell(app).quitting.store(true, Ordering::SeqCst);
    install_pending_update(app);
    app.exit(0);
}

async fn check_for_update(app: &AppHandle) {
    if shell(app)
        .pending_update
        .lock()
        .map(|p| p.is_some())
        .unwrap_or(true)
    {
        return;
    }
    let updater = match app.updater() {
        Ok(u) => u,
        Err(err) => {
            eprintln!("[desktop] updater unavailable: {err}");
            return;
        }
    };
    let update = match updater.check().await {
        Ok(Some(update)) => update,
        Ok(None) => return,
        Err(err) => {
            eprintln!("[desktop] update check failed: {err}");
            return;
        }
    };
    let version = update.version.clone();
    let bytes = match update.download(|_, _| {}, || {}).await {
        Ok(bytes) => bytes,
        Err(err) => {
            eprintln!("[desktop] update download failed: {err}");
            return;
        }
    };
    if let Ok(mut p) = shell(app).pending_update.lock() {
        *p = Some((update, bytes));
    }
    // Started at sign-in and still hidden: nobody is on a call yet, so install now.
    let hidden = app
        .get_webview_window(MAIN)
        .and_then(|w| w.is_visible().ok())
        .map(|v| !v)
        .unwrap_or(true);
    if shell(app).started_hidden && hidden {
        if install_pending_update(app) {
            app.restart();
        }
        return;
    }
    if let Some(item) = shell(app).update_item.lock().ok().and_then(|i| i.clone()) {
        let _ = item.set_text(format!("Restart to update (version {version})"));
        let _ = item.set_enabled(true);
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let state = shell(app);
    let name = state.brand.app_name.clone();
    let finds_company = state.finds_company();
    drop(state);
    let device = if cfg!(target_os = "macos") {
        "this Mac"
    } else {
        "this PC"
    };
    let open = MenuItem::with_id(app, "open", format!("Open {name}"), true, None::<&str>)?;
    let change = MenuItem::with_id(app, "change", "Change company...", true, None::<&str>)?;
    let update = MenuItem::with_id(app, "update", "Up to date", false, None::<&str>)?;
    let quit_item = MenuItem::with_id(
        app,
        "quit",
        format!("Quit (calls stop ringing on {device})"),
        true,
        None::<&str>,
    )?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let menu = if finds_company {
        Menu::with_items(app, &[&open, &change, &sep1, &update, &sep2, &quit_item])?
    } else {
        Menu::with_items(app, &[&open, &sep1, &update, &sep2, &quit_item])?
    };
    if let Ok(mut slot) = shell(app).update_item.lock() {
        *slot = Some(update.clone());
    }
    let mut builder = TrayIconBuilder::with_id(MAIN)
        .tooltip(tray_tooltip(app, 0))
        .menu(&menu)
        .show_menu_on_left_click(cfg!(target_os = "macos"))
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "change" => change_company(app),
            "update" => {
                if install_pending_update(app) {
                    app.restart();
                }
            }
            "quit" => quit(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if !cfg!(target_os = "macos") {
                    show_main(tray.app_handle());
                }
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

pub fn run() {
    let brand: Brand = serde_json::from_str(BRAND_JSON).expect("src-tauri/brand.json is not valid");
    let started_hidden = std::env::args().any(|a| a == "--hidden");

    tauri::Builder::default()
        // First, so a second launch only brings the running app forward (Electron: requestSingleInstanceLock).
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app)
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Shell {
            portal: Mutex::new(None),
            brand,
            quitting: AtomicBool::new(false),
            started_hidden,
            popups: AtomicU32::new(0),
            pending_update: Mutex::new(None),
            update_item: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            incoming_call,
            set_badge,
            notify,
            open_external,
            find_company,
            choose_company
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            let portal = {
                let state = shell(&handle);
                if state.finds_company() {
                    None
                } else {
                    https_origin(&state.brand.portal_url)
                }
            };
            let portal = portal.or_else(|| {
                if shell(&handle).finds_company() {
                    load_workspace(&handle)
                } else {
                    None
                }
            });
            if let Ok(mut p) = shell(&handle).portal.lock() {
                *p = portal;
            }
            // Start at sign-in, hidden (Electron: setLoginItemSettings openAtLogin, --hidden / openAsHidden).
            let autostart = handle.autolaunch();
            if !autostart.is_enabled().unwrap_or(false) {
                if let Err(err) = autostart.enable() {
                    eprintln!("[desktop] could not turn on start at login: {err}");
                }
            }
            build_tray(&handle)?;
            build_main(&handle, started_hidden)?;
            let updates = handle.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    check_for_update(&updates).await;
                    tokio::time::sleep(UPDATE_EVERY).await;
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window hides it; the app keeps running in the tray / menu bar so calls still ring.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == MAIN
                    && !window
                        .app_handle()
                        .state::<Shell>()
                        .quitting
                        .load(Ordering::SeqCst)
                {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building the desktop app")
        .run(|app, event| match event {
            // Dock icon clicked (Electron: "activate").
            #[cfg(target_os = "macos")]
            RunEvent::Reopen { .. } => show_main(app),
            RunEvent::ExitRequested { .. } => {
                shell(app).quitting.store(true, Ordering::SeqCst);
                install_pending_update(app);
            }
            _ => {}
        });
}
