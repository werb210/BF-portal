import Foundation
import Capacitor
import WidgetKit
import BackgroundTasks
import Security

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridgePlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadAllTimelines", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadTimelines", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWidgetSession", returnType: CAPPluginReturnPromise),   // v384
        CAPPluginMethod(name: "clearWidgetSession", returnType: CAPPluginReturnPromise)  // v384
    ]

    private func sharedDefaults(_ call: CAPPluginCall) -> UserDefaults? {
        guard let group = call.getString("group"), !group.isEmpty else {
            call.reject("A non-empty App Group is required")
            return nil
        }
        guard let defaults = UserDefaults(suiteName: group) else {
            call.reject("Unable to open App Group UserDefaults suite: \(group)")
            return nil
        }
        return defaults
    }

    @objc public func setItem(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults(call) else { return }
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("Both key and value are required")
            return
        }
        defaults.set(value, forKey: key)
        defaults.synchronize()
        print("[WidgetBridge] wrote key \(key) (\(value.utf8.count) bytes)")
        call.resolve()
    }

    @objc public func removeItem(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults(call) else { return }
        guard let key = call.getString("key") else {
            call.reject("A key is required")
            return
        }
        defaults.removeObject(forKey: key)
        defaults.synchronize()
        call.resolve()
    }

    @objc public func getItem(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults(call) else { return }
        guard let key = call.getString("key") else {
            call.reject("A key is required")
            return
        }
        if let value = defaults.string(forKey: key) {
            call.resolve(["value": value])
        } else {
            call.resolve(["value": NSNull()])
        }
    }

    @objc public func reloadAllTimelines(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    // BF_PORTAL_WIDGET_SELF_REFRESH_v384 - the app (not the widget) keeps the
    // staff token in its own Keychain so it can refresh the widget in the
    // background. The widget stays display-only and never sees the token.
    @objc public func setWidgetSession(_ call: CAPPluginCall) {
        guard let token = call.getString("token"), !token.isEmpty,
              let apiBase = call.getString("apiBase"), apiBase.hasPrefix("https://") else {
            call.reject("A token and an https API base are required")
            return
        }
        WidgetRefreshSession.save(token: token, apiBase: apiBase)
        WidgetBackgroundRefresh.schedule()
        call.resolve()
    }

    @objc public func clearWidgetSession(_ call: CAPPluginCall) {
        WidgetRefreshSession.clear()
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: WidgetBackgroundRefresh.taskId)
        call.resolve()
    }

    @objc public func reloadTimelines(_ call: CAPPluginCall) {
        guard let kind = call.getString("ofKind"), !kind.isEmpty else {
            call.reject("A widget kind is required")
            return
        }
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
        call.resolve()
    }
}

// BF_PORTAL_WIDGET_SELF_REFRESH_v384
// Staff token for background widget refresh. Keychain, this app only (no access
// group, so the widget extension cannot read it), readable after first unlock so
// a background task can use it, never synced off the device.
enum WidgetRefreshSession {
    static let service = "com.boreal.portal.widget-refresh"

    private static func query(_ account: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account]
    }

    private static func write(_ value: String, account: String) {
        SecItemDelete(query(account) as CFDictionary)
        var add = query(account)
        add[kSecValueData as String] = Data(value.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }

    private static func read(_ account: String) -> String? {
        var q = query(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func save(token: String, apiBase: String) {
        if self.token() == token && self.apiBase == apiBase { return }
        write(token, account: "staff-token")
        write(apiBase, account: "api-base")
    }

    static func token() -> String? { read("staff-token") }
    static var apiBase: String? { read("api-base") }

    static func clear() {
        SecItemDelete(query("staff-token") as CFDictionary)
        SecItemDelete(query("api-base") as CFDictionary)
    }
}

// BF_PORTAL_WIDGET_SELF_REFRESH_v384
enum WidgetBackgroundRefresh {
    static let taskId = "com.boreal.portal.widget-refresh"
    static let group = "group.com.boreal.portal"
    static let silos = ["BF", "BI", "SLF"]

    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskId, using: nil) { task in
            guard let refresh = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }
            handle(refresh)
        }
    }

    static func schedule() {
        guard WidgetRefreshSession.token() != nil else { return }
        let request = BGAppRefreshTaskRequest(identifier: taskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 30 * 60)
        do { try BGTaskScheduler.shared.submit(request) } catch {
            print("[WidgetRefresh] could not schedule: \(error)")
        }
    }

    static func handle(_ task: BGAppRefreshTask) {
        schedule()
        let work = Task {
            let ok = await refreshAll()
            task.setTaskCompleted(success: ok)
        }
        task.expirationHandler = { work.cancel() }
    }

    static func refreshAll() async -> Bool {
        guard let token = WidgetRefreshSession.token(),
              let base = WidgetRefreshSession.apiBase,
              let url = URL(string: base + "/api/widget/summary"),
              let defaults = UserDefaults(suiteName: group) else { return false }
        var wrote = false
        for silo in silos {
            if Task.isCancelled { break }
            var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue(silo, forHTTPHeaderField: "X-Silo")
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            guard let result = try? await URLSession.shared.data(for: request),
                  let http = result.1 as? HTTPURLResponse else { continue }
            if http.statusCode == 401 || http.statusCode == 403 {
                WidgetRefreshSession.clear()
                break
            }
            guard http.statusCode == 200,
                  let fresh = (try? JSONSerialization.jsonObject(with: result.0)) as? [String: Any] else { continue }
            let key = "widget_summary_\(silo)"
            guard let json = defaults.string(forKey: key),
                  let storedData = json.data(using: .utf8),
                  let stored = (try? JSONSerialization.jsonObject(with: storedData)) as? [String: Any],
                  let merged = merge(stored: stored, fresh: fresh, silo: silo),
                  let out = try? JSONSerialization.data(withJSONObject: merged),
                  let text = String(data: out, encoding: .utf8) else { continue }
            defaults.set(text, forKey: key)
            wrote = true
        }
        if wrote { WidgetCenter.shared.reloadAllTimelines() }
        return wrote
    }

    static func merge(stored: [String: Any], fresh: [String: Any], silo: String) -> [String: Any]? {
        guard !stored.isEmpty else { return nil }
        var out = stored
        for field in ["tasksDueToday", "unreadMessages"] {
            if let value = fresh[field] as? NSNumber { out[field] = value }
        }
        if silo == "BF", let value = fresh["commissionEarned"] as? NSNumber { out["commissionEarned"] = value }
        if let asOf = fresh["asOf"] as? String { out["asOf"] = asOf }
        return out
    }
}
