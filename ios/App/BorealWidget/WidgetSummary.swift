// BF_PORTAL_WIDGET_v29
import Foundation

enum WidgetStore {
    static let group = "group.com.boreal.portal"
    static let tokenKey = "widget_auth_token"
    static let siloKey = "widget_active_silo"
    private static let capacitorPrefix = "CapacitorStorage."

    static func string(_ key: String) -> String? {
        guard let defaults = UserDefaults(suiteName: group) else { return nil }
        if let value = defaults.string(forKey: capacitorPrefix + key), !value.isEmpty { return value }
        let value = defaults.string(forKey: key)
        return (value?.isEmpty ?? true) ? nil : value
    }

    static var token: String? { string(tokenKey) }
    static var silo: String? { string(siloKey) }
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

enum WidgetAPI {
    static let baseURL = "https://server.boreal.financial/api"

    static func fetch(silo: WidgetSilo, token: String) async throws -> WidgetSummary {
        guard let url = URL(string: "\(baseURL)/widget/summary") else { throw URLError(.badURL) }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(silo.rawValue, forHTTPHeaderField: "X-Silo")
        request.timeoutInterval = 15
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(WidgetSummary.self, from: data)
    }
}
