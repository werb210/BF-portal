import WidgetKit

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
        let current = entry(for: configuration)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
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
