import Foundation
import SwiftUI

enum WidgetStore {
    static let group = "group.com.boreal.portal"
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
        case .commissionEarned: return summary.commissionEarned
        }
    }

    func display(from summary: WidgetSummary) -> String {
        let raw = value(from: summary)
        guard self == .commissionEarned else { return String(raw) }
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

    var title: String {
        switch self {
        case .bf: return "Financial"
        case .bi: return "Risk Management"
        case .slf: return "SLF"
        }
    }
    var accent: Color {
        switch self { case .bf: return Color(red: 0.08, green: 0.27, blue: 0.48); case .bi: return Color(red: 0.12, green: 0.48, blue: 0.29); case .slf: return .teal }
    }
}
