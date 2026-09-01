import Foundation

struct WidgetSummary: Codable, Equatable {
    let schemaVersion: Int
    let silo: String
    let pipelineCount: Int
    let tasksDueToday: Int
    let tasksOverdue: Int
    let unreadMessages: Int
    let commissionEarned: Int
    let currency: String
    let documentsRequired: Int
    let additionalStepsRequired: Int
    let offersOutstanding: Int
    let nextTask: WidgetTask?
    let nextMeeting: WidgetMeeting?
    let asOf: Date?

    private enum CodingKeys: String, CodingKey {
        case schemaVersion, silo, pipelineCount, tasksDueToday, tasksOverdue, unreadMessages
        case commissionEarned, currency, documentsRequired, additionalStepsRequired
        case offersOutstanding, nextTask, nextMeeting, asOf
    }

    init(schemaVersion: Int = 1, silo: String, pipelineCount: Int, tasksDueToday: Int,
         tasksOverdue: Int, unreadMessages: Int, commissionEarned: Int, currency: String,
         documentsRequired: Int, additionalStepsRequired: Int, offersOutstanding: Int,
         nextTask: WidgetTask?, nextMeeting: WidgetMeeting?, asOf: Date?) {
        self.schemaVersion = schemaVersion
        self.silo = silo
        self.pipelineCount = pipelineCount
        self.tasksDueToday = tasksDueToday
        self.tasksOverdue = tasksOverdue
        self.unreadMessages = unreadMessages
        self.commissionEarned = commissionEarned
        self.currency = currency
        self.documentsRequired = documentsRequired
        self.additionalStepsRequired = additionalStepsRequired
        self.offersOutstanding = offersOutstanding
        self.nextTask = nextTask
        self.nextMeeting = nextMeeting
        self.asOf = asOf
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        schemaVersion = (try? values.decodeIfPresent(Int.self, forKey: .schemaVersion)) ?? 1
        silo = (try? values.decodeIfPresent(String.self, forKey: .silo)) ?? "BF"
        pipelineCount = (try? values.decodeIfPresent(Int.self, forKey: .pipelineCount)) ?? 0
        tasksDueToday = (try? values.decodeIfPresent(Int.self, forKey: .tasksDueToday)) ?? 0
        tasksOverdue = (try? values.decodeIfPresent(Int.self, forKey: .tasksOverdue)) ?? 0
        unreadMessages = (try? values.decodeIfPresent(Int.self, forKey: .unreadMessages)) ?? 0
        commissionEarned = (try? values.decodeIfPresent(Int.self, forKey: .commissionEarned)) ?? 0
        currency = (try? values.decodeIfPresent(String.self, forKey: .currency)) ?? "CAD"
        documentsRequired = (try? values.decodeIfPresent(Int.self, forKey: .documentsRequired)) ?? 0
        additionalStepsRequired = (try? values.decodeIfPresent(Int.self, forKey: .additionalStepsRequired)) ?? 0
        offersOutstanding = (try? values.decodeIfPresent(Int.self, forKey: .offersOutstanding)) ?? 0
        nextTask = try? values.decodeIfPresent(WidgetTask.self, forKey: .nextTask)
        nextMeeting = try? values.decodeIfPresent(WidgetMeeting.self, forKey: .nextMeeting)
        let asOfValue = try? values.decodeIfPresent(String.self, forKey: .asOf)
        asOf = WidgetDate.decodeISODate(asOfValue ?? nil)
    }

    static let placeholder = WidgetSummary(silo: "BF", pipelineCount: 0, tasksDueToday: 0, tasksOverdue: 0,
        unreadMessages: 0, commissionEarned: 0, currency: "CAD", documentsRequired: 0,
        additionalStepsRequired: 0, offersOutstanding: 0, nextTask: nil, nextMeeting: nil, asOf: nil)
}

private enum WidgetDate {
    static func decodeISODate(_ value: String?) -> Date? {
        guard let value else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value)
    }
}

private func tolerantID<Key: CodingKey>(from values: KeyedDecodingContainer<Key>, forKey key: Key) -> String {
    if let value = try? values.decode(String.self, forKey: key) { return value }
    if let value = try? values.decode(Int.self, forKey: key) { return String(value) }
    if let value = try? values.decode(Double.self, forKey: key) { return String(value) }
    return ""
}

struct WidgetTask: Codable, Equatable {
    let id: String; let title: String; let type: String?; let dueAt: Date?; let contactName: String?
    private enum CodingKeys: String, CodingKey { case id, title, type, dueAt, contactName }
    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        id = tolerantID(from: values, forKey: .id)
        title = (try? values.decodeIfPresent(String.self, forKey: .title)) ?? "Task"
        type = try? values.decodeIfPresent(String.self, forKey: .type)
        contactName = try? values.decodeIfPresent(String.self, forKey: .contactName)
        let dateValue = try? values.decodeIfPresent(String.self, forKey: .dueAt)
        dueAt = WidgetDate.decodeISODate(dateValue ?? nil)
    }
}

struct WidgetMeeting: Codable, Equatable {
    let id: String; let title: String; let start: Date?
    private enum CodingKeys: String, CodingKey { case id, title, start }
    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        id = tolerantID(from: values, forKey: .id)
        title = (try? values.decodeIfPresent(String.self, forKey: .title)) ?? "Meeting"
        let dateValue = try? values.decodeIfPresent(String.self, forKey: .start)
        start = WidgetDate.decodeISODate(dateValue ?? nil)
    }
}

