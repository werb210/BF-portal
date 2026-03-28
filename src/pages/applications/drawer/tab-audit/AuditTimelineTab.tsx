import { useQuery } from "@tanstack/react-query";
import { fetchApplicationAudit } from "@/api/applications";
import renderValue from "@/pages/applications/ApplicationDetails";
import { useApplicationDetails } from "@/pages/applications/hooks/useApplicationDetails";
import type { ApplicationAuditEvent } from "@/types/application.types";
import { getErrorMessage } from "@/utils/errors";
import { getAuditEventLabel } from "@/components/Timeline/auditEventLabels";

const AuditTimelineTab = () => {
  const { applicationId, data: details, isLoading, error } = useApplicationDetails();

  const { data: auditEvents = [] } = useQuery<ApplicationAuditEvent[]>({
    queryKey: ["applications", applicationId, "audit"],
    queryFn: ({ signal }) => fetchApplicationAudit(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId)
  });

  if (!applicationId) return <div className="drawer-placeholder">Select an application to view audit history.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading audit timeline…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load audit timeline.")}</div>;

  const timeline = details?.auditTimeline?.length ? details.auditTimeline : auditEvents;

  return (
    <div className="drawer-tab drawer-tab__audit">
      {timeline.length ? (
        <div className="drawer-list">
          {timeline.map((event) => (
            <div key={event.id} className="drawer-list__item">
              <div className="drawer-section">
                <div className="drawer-section__title">{getAuditEventLabel(event)}</div>
                <div className="drawer-section__body">
                  <div className="drawer-kv-list">
                    <div className="drawer-kv-list__item">
                      <dt>When</dt>
                      <dd>{event.createdAt}</dd>
                    </div>
                    {event.actor ? (
                      <div className="drawer-kv-list__item">
                        <dt>Actor</dt>
                        <dd>{event.actor}</dd>
                      </div>
                    ) : null}
                    <div className="drawer-kv-list__item">
                      <dt>Details</dt>
                      <dd>{renderValue(event.detail ?? "No additional details.")}</dd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="drawer-placeholder">No audit activity recorded.</div>
      )}
    </div>
  );
};

export default AuditTimelineTab;
