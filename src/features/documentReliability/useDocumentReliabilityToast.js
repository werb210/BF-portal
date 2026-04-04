import { useEffect } from "react";
import { useNotificationsStore } from "@/state/notifications.store";
import { useAuth } from "@/hooks/useAuth";
import { canAccessStaffPortal, resolveUserRole } from "@/utils/roles";
const issueTracker = new Map();
const createNotification = (title, message) => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `notif-${Date.now()}`,
    type: "system_alert",
    title,
    message,
    createdAt: Date.now(),
    read: false,
    source: "in_app"
});
export const useDocumentReliabilityToast = ({ applicationId, missingFields, conflictFields }) => {
    const addNotification = useNotificationsStore((state) => state.addNotification);
    const { user } = useAuth();
    useEffect(() => {
        if (!applicationId)
            return;
        if (!canAccessStaffPortal(resolveUserRole(user?.role ?? null)))
            return;
        const missingCount = missingFields.length;
        const conflictCount = conflictFields.length;
        const previous = issueTracker.get(applicationId) ?? { missing: 0, conflicts: 0 };
        const hasNewMissing = missingCount > previous.missing;
        const hasNewConflicts = conflictCount > previous.conflicts;
        if (hasNewMissing || hasNewConflicts) {
            const parts = [];
            if (hasNewMissing) {
                parts.push(`Missing required fields: ${missingFields.join(", ") || "—"}.`);
            }
            if (hasNewConflicts) {
                parts.push(`Conflicting fields detected: ${conflictFields.join(", ") || "—"}.`);
            }
            const message = parts.join(" ");
            addNotification(createNotification("Document reliability issue", message));
        }
        issueTracker.set(applicationId, { missing: missingCount, conflicts: conflictCount });
    }, [addNotification, applicationId, conflictFields, missingFields, user?.role]);
};
