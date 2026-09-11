import Foundation
import UserNotifications

// v128-push-categories
// Registers the notification categories the server stamps on each push.
// Without this the aps.category field is ignored and no buttons render.
// Ids must match BF-Server src/services/push/pushCategories.ts exactly.

@objc final class BorealPushCategories: NSObject {

    @objc static func register() {
        let uploadNow = UNNotificationAction(
            identifier: "UPLOAD_NOW",
            title: "Upload Now",
            options: [.foreground, .authenticationRequired]
        )
        let openApplication = UNNotificationAction(
            identifier: "OPEN_APPLICATION",
            title: "Open Application",
            options: [.foreground, .authenticationRequired]
        )
        let viewOffer = UNNotificationAction(
            identifier: "VIEW_OFFER",
            title: "View Offer",
            options: [.foreground, .authenticationRequired]
        )
        let callBack = UNNotificationAction(
            identifier: "CALL_BACK",
            title: "Call Back",
            options: [.foreground, .authenticationRequired]
        )
        let createFollowUp = UNNotificationAction(
            identifier: "CREATE_FOLLOWUP",
            title: "Create Follow-up",
            options: [.foreground, .authenticationRequired]
        )
        let dismissAction = UNNotificationAction(
            identifier: "DISMISS",
            title: "Dismiss",
            options: []
        )

        let documentRequest = UNNotificationCategory(
            identifier: "DOCUMENT_REQUEST",
            actions: [uploadNow, openApplication],
            intentIdentifiers: [],
            options: []
        )
        let applicationUpdate = UNNotificationCategory(
            identifier: "APPLICATION_UPDATE",
            actions: [openApplication],
            intentIdentifiers: [],
            options: []
        )
        let offerReady = UNNotificationCategory(
            identifier: "OFFER_READY",
            actions: [viewOffer, openApplication],
            intentIdentifiers: [],
            options: []
        )
        let missedCall = UNNotificationCategory(
            identifier: "MISSED_CALL",
            actions: [callBack, createFollowUp],
            intentIdentifiers: [],
            options: []
        )
        let taskDue = UNNotificationCategory(
            identifier: "TASK_DUE",
            actions: [createFollowUp, dismissAction],
            intentIdentifiers: [],
            options: []
        )
        let generic = UNNotificationCategory(
            identifier: "GENERIC",
            actions: [],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            documentRequest,
            applicationUpdate,
            offerReady,
            missedCall,
            taskDue,
            generic
        ])
    }
}
