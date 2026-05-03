import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApplicationDetails, fetchLinkedApplications, type LinkedApplicationSummary } from "@/api/applications";
import type { ApplicationDetails } from "@/types/application.types";
import { getProcessingStatus } from "@/pages/applications/utils/processingStatus";

const DrawerHeader = ({
  applicationId,
  onBack,
  canGoBack,
  onClose
}: {
  applicationId: string;
  onBack?: () => void;
  canGoBack?: boolean;
  onClose: () => void;
}) => {
  const { data } = useQuery<ApplicationDetails>({
    queryKey: ["applications", applicationId, "details"],
    queryFn: ({ signal }) => fetchApplicationDetails<ApplicationDetails>(applicationId, { signal }),
    enabled: Boolean(applicationId)
  });

  const title = useMemo(() => data?.applicant ?? "Application", [data]);
  const status = data?.status ?? "";
  const parentApplicationId =
    (data as { parent_application_id?: string | null; metadata?: { parent_application_id?: string | null } } | null)
      ?.parent_application_id ??
    (data as { metadata?: { parent_application_id?: string | null } } | null)?.metadata?.parent_application_id ??
    null;
  const { data: linked } = useQuery<LinkedApplicationSummary[]>({
    queryKey: ["applications", applicationId, "linked", parentApplicationId],
    queryFn: ({ signal }) => fetchLinkedApplications(applicationId, parentApplicationId, { signal }),
    enabled: Boolean(applicationId)
  });
  const processingStatus = useMemo(
    () =>
      getProcessingStatus({
        ocrCompletedAt: (data as { ocr_completed_at?: string | null } | null)?.ocr_completed_at,
        bankingCompletedAt: (data as { banking_completed_at?: string | null } | null)?.banking_completed_at
      }),
    [data]
  );

  return (
    <div className="application-drawer__header">
      <div>
        {onBack ? (
          <button
            className="ui-button ui-button--ghost"
            onClick={onBack}
            disabled={!canGoBack}
            type="button"
          >
            Back
          </button>
        ) : null}
        <div className="application-drawer__title">{title}</div>
        {status ? <div className="application-drawer__subtitle">Status: {status}</div> : null}
        {processingStatus ? (
          <div className="application-drawer__subtitle">{processingStatus.headerLabel}</div>
        ) : null}
        {linked && linked.length > 0 ? (
          <div className="application-drawer__subtitle" style={{ marginTop: 4 }}>
            <strong>Linked: </strong>
            {linked.map((leg, i) => {
              const label = `${leg.product_category ?? "?"}${
                leg.requested_amount != null ? ` · $${Number(leg.requested_amount).toLocaleString()}` : ""
              }`;

              return (
                <span key={leg.id} style={{ marginLeft: i === 0 ? 0 : 6 }}>
                  <a
                    href={`?application=${encodeURIComponent(leg.id)}`}
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#eef2ff",
                      color: "#3730a3",
                      fontSize: 12,
                      textDecoration: "none"
                    }}
                  >
                    {label}
                  </a>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      <button className="application-drawer__close" onClick={onClose} aria-label="Close drawer" type="button">
        ×
      </button>
    </div>
  );
};

export default DrawerHeader;
