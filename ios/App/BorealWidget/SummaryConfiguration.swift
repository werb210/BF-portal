// BF_PORTAL_WIDGET_v29
import AppIntents
import WidgetKit

enum MetricChoice: String, AppEnum {
    case pipeline, tasksDueToday, unreadMessages, commissionEarned
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Metric"
    static var caseDisplayRepresentations: [MetricChoice: DisplayRepresentation] = [
        .pipeline: "Pipeline", .tasksDueToday: "Tasks Due Today",
        .unreadMessages: "Unread Messages", .commissionEarned: "Commission Earned (Keystone: Paying licensees)" // BF_PORTAL_v854_KS_WIDGETS
    ]
    var metric: WidgetMetric { WidgetMetric(rawValue: rawValue)! }
}

enum SiloChoice: String, AppEnum {
    case followApp, bf, bi, slf, ks // BF_PORTAL_v854_KS_WIDGETS
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Business"
    static var caseDisplayRepresentations: [SiloChoice: DisplayRepresentation] = [
        .followApp: "Follow the portal", .bf: "Boreal Financial",
        .bi: "Boreal Risk Management", .slf: "SLF", .ks: "Keystone" // BF_PORTAL_v854_KS_WIDGETS
    ]
    var silo: WidgetSilo {
        switch self {
        // BF_PORTAL_v854_KS_WIDGETS - upper-cased: the portal mirrors BF / BI / SLF / KS (older builds wrote lower case).
        case .followApp: return WidgetSilo(rawValue: (WidgetStore.silo ?? "BF").uppercased()) ?? .bf
        case .bf: return .bf
        case .bi: return .bi
        case .slf: return .slf
        case .ks: return .ks // BF_PORTAL_v854_KS_WIDGETS
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
