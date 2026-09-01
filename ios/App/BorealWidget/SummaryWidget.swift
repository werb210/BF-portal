// BF_PORTAL_WIDGET_COMMAND_CENTRE_v1
import SwiftUI
import WidgetKit

// Regression-visible URL contract: bfportal://pipeline bfportal://tasks
// bfportal://messages bfportal://commission bfportal://crm

struct BorealSummaryWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "BorealPortalSummary", intent: SummaryConfiguration.self, provider: SummaryProvider()) { entry in
            SummaryWidgetView(entry: entry).containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Boreal Portal")
        .description("Your actionable Boreal command centre.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

private func deepLink(_ destination: String, _ silo: WidgetSilo, _ query: String = "") -> URL {
    URL(string: "bfportal://\(destination)?silo=\(silo.rawValue)\(query)")!
}

struct SummaryWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SummaryEntry
    var body: some View {
        if entry.needsData {
            VStack(spacing: 4) { Text("Boreal").font(.headline); Text("Open the portal once to update").font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center) }
                .widgetURL(URL(string: "bfportal://dashboard")!)
        } else {
            switch family {
            case .systemSmall: SmallSummary(entry: entry).widgetURL(entry.configuration.metrics[0].destination(silo: entry.silo))
            case .systemMedium: MediumSummary(entry: entry)
            default: LargeSummary(entry: entry)
            }
        }
    }
}

/// The command-centre header is deliberately one line so WidgetKit never has
/// to compress it against the rounded top edge of medium and large widgets.
struct CommandCentreHeader: View {
    let entry: SummaryEntry
    var body: some View {
        Link(destination: deepLink("dashboard", entry.silo)) {
            HStack(spacing: 6) {
                Circle().fill(entry.silo.accent).frame(width: 7, height: 7)
                Text(entry.silo.title).font(.caption.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.75)
                Spacer(minLength: 6)
                Text(updated).font(.caption2).foregroundStyle(stale ? .tertiary : .secondary).lineLimit(1).fixedSize(horizontal: true, vertical: false)
            }
        }.buttonStyle(.plain)
    }
    private var stale: Bool { entry.summary.asOf.map { Date().timeIntervalSince($0) > 3600 } ?? true }
    private var updated: String { guard let date = entry.summary.asOf else { return "" }; return "Updated " + date.formatted(date: .omitted, time: .shortened) }
}

/// Small widgets retain their purpose-built proportions and do not have to
/// accommodate the wider command-centre timestamp.
struct SmallHeader: View {
    let entry: SummaryEntry
    var body: some View {
        HStack(spacing: 5) {
            Capsule().fill(entry.silo.accent).frame(width: 22, height: 3)
            Text(entry.silo.title).font(.caption2.weight(.semibold)).foregroundStyle(.secondary).lineLimit(1)
        }
    }
}

struct SmallSummary: View {
    let entry: SummaryEntry
    private var metric: WidgetMetric { entry.configuration.metrics[0] }
    private var status: String {
        switch metric { case .pipeline: return "\(entry.summary.documentsRequired + entry.summary.additionalStepsRequired + entry.summary.offersOutstanding) need attention"; case .tasksDueToday: return "\(entry.summary.tasksOverdue) overdue"; case .unreadMessages: return entry.summary.unreadMessages > 0 ? "New inbound" : "Inbox clear"; case .commissionEarned: return "This month" }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            SmallHeader(entry: entry); Spacer(minLength: 0)
            Image(systemName: metric.symbol).foregroundStyle(entry.silo.accent)
            Text(metric.display(from: entry.summary)).font(.system(size: 38, weight: .bold)).minimumScaleFactor(0.55).lineLimit(1)
            Text(metric.title).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            Spacer(minLength: 0); Text(status).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
        }
    }
}

struct MetricCard: View {
    let metric: WidgetMetric; let entry: SummaryEntry; var compact = false
    var body: some View {
        Link(destination: metric.destination(silo: entry.silo)) {
            VStack(alignment: .leading, spacing: compact ? 1 : 3) {
                Image(systemName: metric.symbol).font(.caption).foregroundStyle(entry.silo.accent)
                Text(metric.display(from: entry.summary)).font(compact ? .headline.bold() : .title2.bold()).minimumScaleFactor(0.55).lineLimit(1)
                Text(metric.title).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            }.frame(maxWidth: .infinity, alignment: .leading).padding(compact ? 6 : 8).background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
        }.buttonStyle(.plain)
    }
}

struct Attention { let count: Int; let label: String; let url: URL }
private func attention(_ entry: SummaryEntry) -> [Attention] {
    [Attention(count: entry.summary.tasksOverdue, label: "Overdue Tasks", url: deepLink("tasks", entry.silo, "&view=overdue")),
     Attention(count: entry.summary.documentsRequired, label: "Documents Required", url: deepLink("pipeline", entry.silo)),
     Attention(count: entry.summary.additionalStepsRequired, label: "Additional Steps Required", url: deepLink("pipeline", entry.silo)),
     Attention(count: entry.summary.offersOutstanding, label: "Offer Follow-up", url: deepLink("pipeline", entry.silo))].filter { $0.count > 0 }
}

struct AttentionRow: View {
    let item: Attention; let accent: Color
    var body: some View { Link(destination: item.url) { HStack(spacing: 5) { Image(systemName: "exclamationmark.circle.fill").foregroundStyle(accent); Text("\(item.count)").bold(); Text(item.label); Spacer(minLength: 4); Image(systemName: "chevron.right").font(.caption2).foregroundStyle(.tertiary) }.font(.caption2).lineLimit(1) }.buttonStyle(.plain) }
}

struct MediumSummary: View {
    let entry: SummaryEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            CommandCentreHeader(entry: entry)
            HStack(spacing: 8) { ForEach(entry.configuration.metrics.prefix(2), id: \.rawValue) { MetricCard(metric: $0, entry: entry) } }
            if let urgent = attention(entry).first { AttentionRow(item: urgent, accent: entry.silo.accent) }
            else { Label("No urgent items", systemImage: "checkmark.circle.fill").font(.caption).foregroundStyle(.secondary) }
        }
    }
}

struct LargeSummary: View {
    let entry: SummaryEntry
    private var attentionItems: [Attention] { attention(entry) }
    private var nextItem: NextItem? {
        let task = entry.summary.nextTask
        let meeting = entry.summary.nextMeeting
        switch (task?.dueAt, meeting?.start) {
        case let (taskDate?, meetingDate?): return taskDate <= meetingDate ? task.map(NextItem.task) : meeting.map(NextItem.meeting)
        case (_?, nil): return task.map(NextItem.task)
        case (nil, _?): return meeting.map(NextItem.meeting)
        case (nil, nil): return task.map(NextItem.task) ?? meeting.map(NextItem.meeting)
        }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            CommandCentreHeader(entry: entry)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 5) {
                ForEach(entry.configuration.metrics.prefix(4), id: \.rawValue) { MetricCard(metric: $0, entry: entry, compact: true) }
            }.padding(.top, 5)
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text("NEEDS ATTENTION")
                    Spacer()
                    if attentionItems.count > 2 {
                        Link("+\(attentionItems.count - 2) more", destination: deepLink("pipeline", entry.silo)).font(.caption2).fontWeight(.regular).buttonStyle(.plain)
                    }
                }.font(.caption2.bold()).foregroundStyle(.secondary)
                if attentionItems.isEmpty { Label("No urgent items", systemImage: "checkmark.circle.fill").font(.caption2).foregroundStyle(.secondary) }
                else { ForEach(Array(attentionItems.prefix(2).enumerated()), id: \.offset) { AttentionRow(item: $0.element, accent: entry.silo.accent) } }
            }.padding(.top, 5)
            if let nextItem {
                VStack(alignment: .leading, spacing: 2) {
                    Text("NEXT").font(.caption2.bold()).foregroundStyle(.secondary)
                    Link(destination: nextItem.destination(for: entry.silo)) { NextRow(date: nextItem.date, title: nextItem.title, symbol: nextItem.symbol) }.buttonStyle(.plain)
                }.padding(.top, 5)
            }
            HStack { Quick("Pipeline", "pipeline", entry); Spacer(); Quick("CRM", "crm", entry); Spacer(); Quick("Tasks", "tasks", entry); Spacer(); Quick("Inbox", "messages", entry, "&filter=unread") }
                .padding(.top, 5)
        }.padding(.vertical, 7)
    }
    private func Quick(_ title: String, _ destination: String, _ entry: SummaryEntry, _ query: String = "") -> some View { Link(title, destination: deepLink(destination, entry.silo, query)).font(.caption.bold()).buttonStyle(.plain).foregroundStyle(entry.silo.accent) }
}

struct NextRow: View {
    let date: Date?; let title: String; let symbol: String
    var body: some View { HStack(spacing: 6) { Image(systemName: symbol).foregroundStyle(.secondary); if let date { Text(date, style: .time).font(.caption.bold()).fixedSize(horizontal: true, vertical: false) }; Text(title).font(.caption).lineLimit(1).truncationMode(.tail).layoutPriority(1) } }
}

private enum NextItem {
    case task(WidgetTask)
    case meeting(WidgetMeeting)
    var date: Date? { switch self { case .task(let task): return task.dueAt; case .meeting(let meeting): return meeting.start } }
    var title: String { switch self { case .task(let task): return task.title; case .meeting(let meeting): return meeting.title } }
    var symbol: String { switch self { case .task: return "checkmark.circle"; case .meeting: return "calendar" } }
    func destination(for silo: WidgetSilo) -> URL { switch self { case .task: return deepLink("tasks", silo); case .meeting: return deepLink("calendar", silo) } }
}
