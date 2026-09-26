import UIKit
import Capacitor
import BackgroundTasks
import AppIntents // BF_PORTAL_BLOCK_v556
import CoreSpotlight
import UniformTypeIdentifiers

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // v128-push-categories
        BorealPushCategories.register()
        // BF_PORTAL_WIDGET_SELF_REFRESH_v384 - must register before launch finishes.
        WidgetBackgroundRefresh.register()
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    // BF_PORTAL_PUSH_NOTIFICATIONS_v1
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        if PortalLaunch.handle(userActivity) { return true } // BF_PORTAL_BLOCK_v556 - Spotlight result
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}


// BF_PORTAL_IOS26_SCENE_v1 - iOS 26 requires the UIScene lifecycle; without it the
// Capacitor window never presents (blank/blue screen). Loads the same Main
// storyboard (CAPBridgeViewController) the app already used, so config parsing is
// unchanged. Kept in AppDelegate.swift so no Xcode project file edit is needed.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        let window = UIWindow(windowScene: windowScene)
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        window.rootViewController = storyboard.instantiateInitialViewController()
        self.window = window
        window.makeKeyAndVisible()
        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let activity = connectionOptions.userActivities.first, PortalLaunch.handle(activity) {
            // BF_PORTAL_BLOCK_v556 - cold launch from a Spotlight result
        } else if let activity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
        }
    }
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        if PortalLaunch.handle(userActivity) { return } // BF_PORTAL_BLOCK_v556
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
    // BF_PORTAL_WIDGET_SELF_REFRESH_v384 - with the scene lifecycle the app
    // delegate's didEnterBackground is not called; queue the next refresh here.
    func sceneDidEnterBackground(_ scene: UIScene) {
        WidgetBackgroundRefresh.schedule()
    }
}

// BF_PORTAL_BLOCK_v556 - Siri Shortcuts + Spotlight.
// Both end the same way: a portal route is parked here and handed to the web app,
// which navigates to it (PortalLauncherPlugin -> src/native/portalLauncher.ts).
// A route starting with "maya:" is a command for Maya instead of a screen.
extension Notification.Name {
    static let borealPortalRoute = Notification.Name("borealPortalRoute")
}

enum PortalLaunch {
    static let key = "boreal.portal.pendingRoute"
    static let spotlightDomain = "boreal.portal"

    static func open(_ route: String) {
        UserDefaults.standard.set(route, forKey: key)
        NotificationCenter.default.post(name: .borealPortalRoute, object: nil)
    }

    static func take() -> String {
        let route = UserDefaults.standard.string(forKey: key) ?? ""
        UserDefaults.standard.removeObject(forKey: key)
        return route
    }

    static func handle(_ activity: NSUserActivity) -> Bool {
        guard activity.activityType == CSSearchableItemActionType,
              let id = activity.userInfo?[CSSearchableItemActivityIdentifier] as? String,
              id.hasPrefix("/") else { return false }
        open(id)
        return true
    }
}

@objc(PortalLauncherPlugin)
public class PortalLauncherPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PortalLauncherPlugin"
    public let jsName = "PortalLauncher"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "take", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "index", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearIndex", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(routeArrived), name: .borealPortalRoute, object: nil)
    }

    @objc func routeArrived() {
        let route = PortalLaunch.take()
        if !route.isEmpty { notifyListeners("route", data: ["route": route], retainUntilConsumed: true) }
    }

    @objc func take(_ call: CAPPluginCall) { call.resolve(["route": PortalLaunch.take()]) }

    @objc func index(_ call: CAPPluginCall) {
        let raw = call.getArray("items", JSObject.self) ?? []
        let items: [CSSearchableItem] = raw.compactMap { item in
            guard let route = item["route"] as? String, route.hasPrefix("/"),
                  let title = item["title"] as? String, !title.isEmpty else { return nil }
            let attrs = CSSearchableItemAttributeSet(contentType: UTType.text)
            attrs.title = title
            attrs.contentDescription = item["subtitle"] as? String
            return CSSearchableItem(uniqueIdentifier: route, domainIdentifier: PortalLaunch.spotlightDomain, attributeSet: attrs)
        }
        let index = CSSearchableIndex.default()
        index.deleteSearchableItems(withDomainIdentifiers: [PortalLaunch.spotlightDomain]) { _ in
            index.indexSearchableItems(items) { error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve(["indexed": items.count]) }
            }
        }
    }

    @objc func clearIndex(_ call: CAPPluginCall) {
        CSSearchableIndex.default().deleteSearchableItems(withDomainIdentifiers: [PortalLaunch.spotlightDomain]) { _ in call.resolve() }
    }
}

@available(iOS 16.0, *)
struct OpenPipelineIntent: AppIntent {
    static let title: LocalizedStringResource = "Open pipeline"
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { PortalLaunch.open("/pipeline"); return .result() }
}
@available(iOS 16.0, *)
struct OpenTasksIntent: AppIntent {
    static let title: LocalizedStringResource = "Open today's tasks"
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { PortalLaunch.open("/tasks?view=due_today"); return .result() }
}
@available(iOS 16.0, *)
struct OpenCalendarIntent: AppIntent {
    static let title: LocalizedStringResource = "Open calendar"
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { PortalLaunch.open("/calendar"); return .result() }
}
@available(iOS 16.0, *)
struct OpenMessagesIntent: AppIntent {
    static let title: LocalizedStringResource = "Open messages"
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { PortalLaunch.open("/communications?tab=inbox"); return .result() }
}
@available(iOS 16.0, *)
struct OpenNewestApplicationIntent: AppIntent {
    static let title: LocalizedStringResource = "Open the newest application"
    static let openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { PortalLaunch.open("maya:open the newest application"); return .result() }
}
@available(iOS 16.0, *)
struct AskMayaIntent: AppIntent {
    static let title: LocalizedStringResource = "Ask Maya"
    static let openAppWhenRun = true
    @Parameter(title: "What should Maya do?") var command: String
    @MainActor func perform() async throws -> some IntentResult { PortalLaunch.open("maya:" + command); return .result() }
}
@available(iOS 16.0, *)
struct BorealPortalShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: OpenPipelineIntent(), phrases: ["Open my \(.applicationName) pipeline", "Show the pipeline in \(.applicationName)"])
        AppShortcut(intent: OpenNewestApplicationIntent(), phrases: ["Open the newest application in \(.applicationName)"])
        AppShortcut(intent: OpenTasksIntent(), phrases: ["Show my tasks in \(.applicationName)"])
        AppShortcut(intent: OpenCalendarIntent(), phrases: ["Open my \(.applicationName) calendar"])
        AppShortcut(intent: OpenMessagesIntent(), phrases: ["Open messages in \(.applicationName)"])
        AppShortcut(intent: AskMayaIntent(), phrases: ["Ask Maya in \(.applicationName)"])
    }
}
