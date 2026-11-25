import WidgetKit
import Foundation
import Security

struct SummaryEntry: TimelineEntry {
    let date: Date
    let summary: WidgetSummary
    let configuration: SummaryConfiguration
    let silo: WidgetSilo
    let needsData: Bool
}

struct SummaryProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SummaryEntry {
        SummaryEntry(date: Date(), summary: .placeholder, configuration: SummaryConfiguration(), silo: .bf, needsData: false)
    }
    func snapshot(for configuration: SummaryConfiguration, in context: Context) async -> SummaryEntry { entry(for: configuration) }
    func timeline(for configuration: SummaryConfiguration, in context: Context) async -> Timeline<SummaryEntry> {
        // BF_PORTAL_WIDGET_SELF_REFRESH_v2 - the widget fetches its own figures every 15 minutes. Before, only the app
        // (when open) or an iOS background task (which iOS rarely runs on an iPad) wrote them, so the widgets sat on
        // old numbers. The app's own snapshot is still the base; this call refreshes every figure the server works out.
        await WidgetLiveRefresh.refresh(silo: configuration.silo.silo)
        let current = entry(for: configuration)
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        return Timeline(entries: [current], policy: .after(next))
    }
    private func entry(for configuration: SummaryConfiguration) -> SummaryEntry {
        let silo = configuration.silo.silo
        guard let summary = WidgetStore.summary(for: silo) else {
            return SummaryEntry(date: Date(), summary: .placeholder, configuration: configuration, silo: silo, needsData: true)
        }
        return SummaryEntry(date: Date(), summary: summary, configuration: configuration, silo: silo, needsData: false)
    }
}

// BF_PORTAL_WIDGET_SELF_REFRESH_v2 - the staff session the app shares with this widget through a Keychain access group
// (this team's apps only, this device only, readable after first unlock). Nothing is kept in the shared UserDefaults.
enum WidgetSharedSession {
    static let service = "com.boreal.portal.widget-refresh"
    static let accessGroup = "76VAY7UJKJ.com.borealfinancial.portal.widget"

    static func read(_ account: String) -> String? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                kSecAttrService as String: service,
                                kSecAttrAccount as String: account,
                                kSecAttrAccessGroup as String: accessGroup,
                                kSecReturnData as String: true,
                                kSecMatchLimit as String: kSecMatchLimitOne]
        var item: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static var token: String? { read("staff-token") }
    static var apiBase: String? { read("api-base") }
}

enum WidgetLiveRefresh {
    static func refresh(silo: WidgetSilo) async {
        guard let token = WidgetSharedSession.token, let base = WidgetSharedSession.apiBase,
              let url = URL(string: base + "/api/widget/summary"),
              let defaults = UserDefaults(suiteName: WidgetStore.group) else { return }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 12)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(silo.rawValue, forHTTPHeaderField: "X-Silo")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let http = response as? HTTPURLResponse, http.statusCode == 200,
              let fresh = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return }
        let key = "widget_summary_\(silo.rawValue)"
        let stored = defaults.string(forKey: key)?.data(using: .utf8)
            .flatMap { (try? JSONSerialization.jsonObject(with: $0)) as? [String: Any] }
            ?? (silo.rawValue == "KS" ? ["schemaVersion": 2, "silo": "KS", "currency": "CAD"] : nil)
        guard let base = stored, let merged = merge(stored: base, fresh: fresh, silo: silo.rawValue),
              let out = try? JSONSerialization.data(withJSONObject: merged),
              let text = String(data: out, encoding: .utf8) else { return }
        defaults.set(text, forKey: key)
    }

    /// The server's figures over the app's snapshot. BF / BI / SLF keep the app's pipeline count and next meeting (the
    /// server cannot see Boreal Risk Management or SLF deals); Keystone takes every figure from the server.
    static func merge(stored: [String: Any], fresh: [String: Any], silo: String) -> [String: Any]? {
        var out = stored
        if silo == "KS" {
            guard fresh["kind"] as? String == "keystone" else { return nil }
            for field in ["pipelineCount", "tasksDueToday", "tasksOverdue", "unreadMessages", "payingLicensees", "demosNeedFollowUp",
                          "openSupportTickets", "available", "nextTask", "nextMeeting"] {
                out[field] = fresh[field] ?? NSNull()
            }
            out["unavailableReason"] = fresh["reason"] ?? NSNull()
        } else {
            guard fresh["kind"] == nil else { return nil }
            for field in ["tasksDueToday", "unreadMessages", "tasksOverdue"] {
                if let value = fresh[field] as? NSNumber { out[field] = value }
            }
            if fresh.keys.contains("nextTask") { out["nextTask"] = fresh["nextTask"] ?? NSNull() }
            if silo == "BF", let value = fresh["commissionEarned"] as? NSNumber { out["commissionEarned"] = value }
        }
        if let asOf = fresh["asOf"] as? String { out["asOf"] = asOf }
        return out
    }
}
