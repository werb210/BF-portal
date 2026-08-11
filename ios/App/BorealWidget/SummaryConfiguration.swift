// BF_PORTAL_WIDGET_v29
import AppIntents
import WidgetKit

enum MetricChoice: String, AppEnum {
    case pipeline, tasksDueToday, unreadMessages, commissionEarned
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Metric"
    static var caseDisplayRepresentations: [MetricChoice: DisplayRepresentation] = [
        .pipeline: "Pipeline", .tasksDueToday: "Tasks Due Today",
        .unreadMessages: "Unread Messages", .commissionEarned: "Commission Earned"
    ]
    var metric: WidgetMetric { WidgetMetric(rawValue: rawValue)! }
}

enum SiloChoice: String, AppEnum {
    case followApp, bf, bi, slf
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Business"
    static var caseDisplayRepresentations: [SiloChoice: DisplayRepresentation] = [
        .followApp: "Follow the portal", .bf: "Boreal Financial",
        .bi: "Boreal Risk Management", .slf: "SLF"
    ]
    var silo: WidgetSilo {
        switch self {
        case .followApp: return WidgetSilo(rawValue: WidgetStore.silo ?? "BF") ?? .bf
        case .bf: return .bf
        case .bi: return .bi
        case .slf: return .slf
        }
    }
}

struct SummaryConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Boreal Portal"
    static var description = IntentDescription("Pick the business and what each tile shows.")
    @Parameter(title: "Business", default: .followApp) var silo: SiloChoice
    @Parameter(title: "First", default: .pipeline) var first: MetricChoice
    @Parameter(title: "Second", default: .tasksDueToday) var second: MetricChoice
    @Parameter(title: "Third", default: .unreadMessages) var third: MetricChoice
    @Parameter(title: "Fourth", default: .commissionEarned) var fourth: MetricChoice
    var metrics: [WidgetMetric] { [first.metric, second.metric, third.metric, fourth.metric] }
}
