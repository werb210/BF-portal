// BF_PORTAL_WIDGET_v29
import SwiftUI
import WidgetKit

struct BorealSummaryWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "BorealPortalSummary", intent: SummaryConfiguration.self, provider: SummaryProvider()) { entry in
            SummaryWidgetView(entry: entry).containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Boreal Portal")
        .description("Pipeline, tasks, messages and commission.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct SummaryWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SummaryEntry
    private var visible: [WidgetMetric] {
        switch family {
        case .systemSmall: return Array(entry.configuration.metrics.prefix(1))
        case .systemMedium: return Array(entry.configuration.metrics.prefix(2))
        default: return entry.configuration.metrics
        }
    }
    var body: some View {
        if entry.needsSignIn {
            VStack(spacing: 4) {
                Text("Boreal").font(.headline)
                Text("Open the portal to sign in").font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
        } else {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(entry.silo.title).font(.caption2).foregroundStyle(.secondary)
                    Spacer()
                    if let asOf = entry.summary.asOf { Text(asOf, style: .time).font(.caption2).foregroundStyle(.secondary) }
                }
                if family == .systemSmall {
                    ForEach(visible, id: \.rawValue) { MetricTile(metric: $0, summary: entry.summary, large: true) }
                } else {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], alignment: .leading, spacing: 10) {
                        ForEach(visible, id: \.rawValue) { MetricTile(metric: $0, summary: entry.summary, large: false) }
                    }
                }
                Spacer(minLength: 0)
            }
        }
    }
}

struct MetricTile: View {
    let metric: WidgetMetric
    let summary: WidgetSummary
    let large: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(metric.display(from: summary)).font(large ? .system(size: 34, weight: .semibold) : .title3.weight(.semibold)).minimumScaleFactor(0.5).lineLimit(1)
            Text(metric.title).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
        }
    }
}
