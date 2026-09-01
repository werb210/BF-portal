import Foundation

@main
enum WidgetSummaryDecoderTests {
    static func decode(_ json: String) throws -> WidgetSummary {
        try JSONDecoder().decode(WidgetSummary.self, from: Data(json.utf8))
    }

    static func require(_ condition: @autoclosure () -> Bool, _ message: String) {
        guard condition() else {
            fatalError("WidgetSummary decoder test failed: \(message)")
        }
    }

    static func main() throws {
        let old = try decode(#"{"silo":"BF","pipelineCount":5,"tasksDueToday":3,"unreadMessages":0,"commissionEarned":0,"currency":"CAD","asOf":"2026-09-01T15:22:10Z"}"#)
        require(old.schemaVersion == 1, "old snapshots default to schema version 1")
        require(old.pipelineCount == 5 && old.tasksDueToday == 3, "old core metrics survive")
        require(old.tasksOverdue == 0 && old.documentsRequired == 0 && old.additionalStepsRequired == 0 && old.offersOutstanding == 0, "missing enrichment defaults to zero")

        let full = try decode(#"{"schemaVersion":2,"silo":"BF","pipelineCount":5,"tasksDueToday":3,"tasksOverdue":2,"unreadMessages":4,"commissionEarned":100,"currency":"CAD","documentsRequired":2,"additionalStepsRequired":1,"offersOutstanding":6,"nextTask":{"id":42,"title":"Call client","dueAt":"2026-09-01T15:22:10.123Z","contactName":null},"nextMeeting":{"id":"meeting-1","title":"Review","start":"2026-09-01T15:22:10Z"},"asOf":"2026-09-01T15:22:10.123Z","futureField":true}"#)
        require(full.schemaVersion == 2 && full.tasksOverdue == 2 && full.documentsRequired == 2, "full command-centre values survive")
        require(full.nextTask?.id == "42" && full.nextTask?.type == nil && full.nextTask?.contactName == nil, "tasks tolerate numeric IDs and missing type/contact")
        require(full.nextTask?.dueAt != nil && full.nextMeeting?.start != nil && full.asOf != nil, "both supported ISO date forms decode")
        require(full.offersOutstanding == 6, "unknown keys do not affect known command-centre data")

        let malformed = try decode(#"{"silo":"BF","pipelineCount":5,"tasksDueToday":3,"unreadMessages":0,"commissionEarned":0,"currency":"CAD","nextMeeting":{"id":"m","title":"Review","start":"not-a-date"},"asOf":"also-not-a-date"}"#)
        require(malformed.pipelineCount == 5, "malformed optional dates preserve core data")
        require(malformed.nextMeeting != nil && malformed.nextMeeting?.start == nil, "a malformed meeting date degrades independently")
        require(malformed.asOf == nil, "a malformed asOf degrades independently")

        let invalidOptionals = try decode(#"{"silo":"BF","pipelineCount":5,"tasksDueToday":3,"tasksOverdue":"bad","unreadMessages":0,"commissionEarned":0,"currency":"CAD","nextTask":17,"nextMeeting":false}"#)
        require(invalidOptionals.tasksOverdue == 0 && invalidOptionals.nextTask == nil && invalidOptionals.nextMeeting == nil, "invalid enrichment types degrade independently")

        print("WidgetSummary decoder scenarios A-I passed")
    }
}
