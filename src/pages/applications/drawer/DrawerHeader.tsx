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
  // BF_PORTAL_BLOCK_v123b_CALL_CLIENT_AND_APP_TAB_v1
  const applicantPhone = (() => {
    const info = (data as any)?.applicantInfo ?? (data as any)?.applicantDetails ?? null;
    if (info && typeof info === "object") {
      const raw = info.phone ?? info.phone_number ?? info.phoneNumber ?? null;
      if (typeof raw === "string" && raw.trim()) return raw.trim();
    }
    return null;
  })();
  // BF_PORTAL_BLOCK_v95_LINKED_FIELD_NAME_FIX_v1
  const parentApplicationId =
    (data as any)?.parentApplicationId ??
    (data as any)?.parent_application_id ??
    (data as any)?.metadata?.parent_application_id ??
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
        {applicantPhone ? (
          <a
            href={`tel:${applicantPhone}`}
            style={{
              display: "inline-block",
              marginLeft: 8,
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              textDecoration: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontWeight: 600,
            }}
            data-testid="drawer-call-client"
          >
            📞 Call client
          </a>
        ) : null}
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
