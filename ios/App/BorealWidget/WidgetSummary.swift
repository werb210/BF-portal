import Foundation

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
        decoder.dateDecodingStrategy = .custom { decoder in
            let value = try decoder.singleValueContainer().decode(String.self)
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: value) { return date }
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: value) { return date }
            throw DecodingError.dataCorruptedError(
                in: try decoder.singleValueContainer(),
                debugDescription: "Invalid ISO-8601 date"
            )
        }
        return try? decoder.decode(WidgetSummary.self, from: data)
    }
}

struct WidgetSummary: Codable, Equatable {
    let silo: String
    let pipelineCount: Int
    let tasksDueToday: Int
    let unreadMessages: Int
    let commissionEarned: Int
    let currency: String
    let asOf: Date?

    static let placeholder = WidgetSummary(silo: "BF", pipelineCount: 0, tasksDueToday: 0,
        unreadMessages: 0, commissionEarned: 0, currency: "CAD", asOf: nil)
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
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: raw)) ?? "$\(raw)"
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
}
