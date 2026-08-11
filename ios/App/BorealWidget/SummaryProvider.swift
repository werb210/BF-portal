// BF_PORTAL_WIDGET_v29
import WidgetKit

struct SummaryEntry: TimelineEntry {
    let date: Date
    let summary: WidgetSummary
    let configuration: SummaryConfiguration
    let silo: WidgetSilo
    let needsSignIn: Bool
}

struct SummaryProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> SummaryEntry {
        SummaryEntry(date: Date(), summary: .placeholder, configuration: SummaryConfiguration(), silo: .bf, needsSignIn: false)
    }
    func snapshot(for configuration: SummaryConfiguration, in context: Context) async -> SummaryEntry { await entry(for: configuration) }
    func timeline(for configuration: SummaryConfiguration, in context: Context) async -> Timeline<SummaryEntry> {
        let current = await entry(for: configuration)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        return Timeline(entries: [current], policy: .after(next))
    }
    private func entry(for configuration: SummaryConfiguration) async -> SummaryEntry {
        let silo = configuration.silo.silo
        guard let token = WidgetStore.token else {
            return SummaryEntry(date: Date(), summary: .placeholder, configuration: configuration, silo: silo, needsSignIn: true)
        }
        do {
            let summary = try await WidgetAPI.fetch(silo: silo, token: token)
            return SummaryEntry(date: Date(), summary: summary, configuration: configuration, silo: silo, needsSignIn: false)
        } catch {
            return SummaryEntry(date: Date(), summary: .placeholder, configuration: configuration, silo: silo, needsSignIn: false)
        }
    }
}
