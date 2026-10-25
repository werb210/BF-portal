import Foundation
import SwiftUI
import UIKit // BF_PORTAL_v854_KS_WIDGETS - the Keystone violet adapts to light and dark

enum WidgetStore {
    static let group = "group.com.borealfinancial.portal"
    static let siloKey = "widget_active_silo"

    static func string(_ key: String) -> String? {
        guard let value = UserDefaults(suiteName: group)?.string(forKey: key), !value.isEmpty else {
            return nil
        }
        return value
    }

    static var silo: String? { string(siloKey) }

    static func summary(for silo: WidgetSilo) -> WidgetSummary? {
        guard let json = string("widget_summary_\(silo.rawValue)"),
              let data = json.data(using: .utf8) else { return nil }
        let decoder = JSONDecoder()
        do {
            return try decoder.decode(WidgetSummary.self, from: data)
        } catch {
            print("[BorealWidget] snapshot decode failed for \(silo.rawValue): \(error)")
            return nil
        }
    }
}

enum WidgetMetric: String, CaseIterable {
    case pipeline, tasksDueToday, unreadMessages, commissionEarned

    var title: String {
        switch self {
        case .pipeline: return "Pipeline"
        case .tasksDueToday: return "Tasks Due"
        case .unreadMessages: return "Unread"
        case .commissionEarned: return "Commission"
        }
    }

    func value(from summary: WidgetSummary) -> Int {
        switch self {
        case .pipeline: return summary.pipelineCount
        case .tasksDueToday: return summary.tasksDueToday
        case .unreadMessages: return summary.unreadMessages
        case .commissionEarned: return summary.silo == "KS" ? summary.payingLicensees : summary.commissionEarned // BF_PORTAL_v854_KS_WIDGETS
        }
    }

    func display(from summary: WidgetSummary) -> String {
        let raw = value(from: summary)
        guard self == .commissionEarned, summary.silo != "KS" else { return String(raw) } // BF_PORTAL_v854_KS_WIDGETS - a count
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = summary.currency
        formatter.maximumFractionDigits = raw >= 1_000_000 ? 1 : 0
        if raw >= 1_000_000 { return (formatter.currencySymbol ?? "") + String(format: "%.1fM", Double(raw) / 1_000_000) }
        if raw >= 1_000 { return (formatter.currencySymbol ?? "") + "\(raw / 1_000)K" }
        return formatter.string(from: NSNumber(value: raw)) ?? "$\(raw)"
    }

    var symbol: String {
        switch self { case .pipeline: return "briefcase.fill"; case .tasksDueToday: return "checkmark.circle.fill"; case .unreadMessages: return "envelope.badge.fill"; case .commissionEarned: return "dollarsign.circle.fill" }
    }

    // BF_PORTAL_v854_KS_WIDGETS - Keystone earns no commission: that tile is the number of paying licensees.
    func tileTitle(for silo: WidgetSilo) -> String { silo == .ks && self == .commissionEarned ? "Paying licensees" : self.title }
    func tileSymbol(for silo: WidgetSilo) -> String { silo == .ks && self == .commissionEarned ? "person.2.fill" : self.symbol }

    func destination(silo: WidgetSilo) -> URL {
        let base: String
        switch self { case .pipeline: base = "pipeline"; case .tasksDueToday: base = "tasks"; case .unreadMessages: base = "messages"; case .commissionEarned: base = "commission" }
        let extra = self == .tasksDueToday ? "&view=due_today" : (self == .unreadMessages ? "&filter=unread" : "")
        return URL(string: "bfportal://\(base)?silo=\(silo.rawValue)\(extra)")!
    }
}

enum WidgetSilo: String, CaseIterable {
    case bf = "BF"
    case bi = "BI"
    case slf = "SLF"
    case ks = "KS" // BF_PORTAL_v854_KS_WIDGETS - Keystone

    var title: String {
        switch self {
        case .bf: return "Financial"
        case .bi: return "Risk Management"
        case .slf: return "SLF"
        case .ks: return "Keystone" // BF_PORTAL_v854_KS_WIDGETS
        }
    }
    var accent: Color {
        switch self { case .bf: return Color(red: 0.08, green: 0.27, blue: 0.48); case .bi: return Color(red: 0.12, green: 0.48, blue: 0.29); case .slf: return .teal; case .ks: return Self.keystoneViolet }
    }
    /// BF_PORTAL_v854_KS_WIDGETS - the Keystone violet of the dialler's KS line: #6D28D9 on light widgets, #C4B5FD on dark ones
    /// (#6D28D9 on a dark widget is about 2.8:1, too faint for the tile icons and the quick links).
    static let keystoneViolet = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0xC4 / 255.0, green: 0xB5 / 255.0, blue: 0xFD / 255.0, alpha: 1)
            : UIColor(red: 0x6D / 255.0, green: 0x28 / 255.0, blue: 0xD9 / 255.0, alpha: 1)
    })
}
