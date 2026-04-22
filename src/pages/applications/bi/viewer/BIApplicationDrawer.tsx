import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { retryUnlessClientError } from "@/api/retryPolicy";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { useSilo } from "@/hooks/useSilo";
import { biPipelineApi } from "../bi.pipeline.api";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "application", label: "Application" },
  { id: "documents", label: "Documents" },
  { id: "requirements", label: "Requirements" },
  { id: "requirement_history", label: "Requirement History" },
  { id: "pgi_comms", label: "PGI Comms" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" }
] as const;

type BIDrawerTab = (typeof TABS)[number]["id"];

const quoteSummaryValue = (value: unknown) => {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
};

type BIApplicationDrawerProps = {
  applicationId: string | null;
  onClose: () => void;
};

const dayDiff = (dateString: string) => Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000));

const BIApplicationDrawer = ({ applicationId, onClose }: BIApplicationDrawerProps) => {
  const { silo } = useSilo();
  const [tab, setTab] = useState<BIDrawerTab>("overview");
  const requirementsEnabled = FEATURE_FLAGS.BI_REQUIREMENTS;

  const detailQuery = useQuery({
    queryKey: ["bi", "application", applicationId],
    queryFn: ({ signal }) => biPipelineApi.fetchDetail(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId) && silo === "bi",
    retry: retryUnlessClientError,
    refetchInterval: 30_000
  });

  const documentsQuery = useQuery({
    queryKey: ["bi", "documents", applicationId],
    queryFn: ({ signal }) => biPipelineApi.fetchDocuments(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId) && silo === "bi",
    retry: retryUnlessClientError
  });

  const requirementsQuery = useQuery({
    queryKey: ["bi", "requirements", applicationId],
    queryFn: ({ signal }) => biPipelineApi.fetchRequirements(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId) && silo === "bi" && requirementsEnabled,
    retry: retryUnlessClientError
  });

  const requirementHistoryQuery = useQuery({
    queryKey: ["bi", "requirements", "history", applicationId],
    queryFn: ({ signal }) => biPipelineApi.fetchRequirementHistory(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId) && silo === "bi" && requirementsEnabled,
    retry: retryUnlessClientError
  });

  const activityQuery = useQuery({
    queryKey: ["bi", "activity", applicationId],
    queryFn: ({ signal }) => biPipelineApi.fetchActivity(applicationId ?? "", { signal }),
    enabled: Boolean(applicationId) && silo === "bi",
    retry: retryUnlessClientError
  });

  const documentsAvailable = !documentsQuery.error || ![404, 501].includes((documentsQuery.error as { status?: number } | null)?.status ?? 0);

  const quoteCountdown = useMemo(() => {
    const expiry = detailQuery.data?.quote_expiry_at;
    if (!expiry) return "—";
    const ms = new Date(expiry).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    return `${Math.ceil(ms / 86_400_000)} days`;
  }, [detailQuery.data?.quote_expiry_at]);

  if (!applicationId || silo !== "bi") return null;

  const detail = detailQuery.data;
  const requirements = requirementsEnabled ? requirementsQuery.data ?? [] : [];
  const visibleTabs = (requirementsEnabled ? TABS : TABS.filter((item) => item.id !== "requirements" && item.id !== "requirement_history"))
    .filter((item) => (documentsAvailable ? true : item.id !== "documents"));

  return (
    <div className="application-drawer-overlay" onClick={onClose}>
      <div className="application-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="application-drawer__header">
          <div>
            <div className="application-drawer__title">{detail?.business_name ?? "BI Application"}</div>
            <div className="application-drawer__subtitle">{applicationId}</div>
          </div>
          <button className="btn" onClick={onClose} type="button">Close</button>
        </div>

        <div className="tabs">
          {visibleTabs.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? "tab--active" : ""}`} onClick={() => setTab(t.id)} type="button">
              {t.label}
            </button>
          ))}
        </div>

        <div className="application-drawer__content">
          {tab === "overview" ? (
            <div className="space-y-3">
              <div>Stage badge: {detail?.stage ?? "—"}</div>
              <div>CORE score: {detail?.core_score ?? "—"}</div>
              {detail?.pgi_external_id ? <div>PGI external ID: {detail.pgi_external_id}</div> : null}
              {detail?.quote_summary ? (
                <div>
                  Quote summary:
                  <ul>
                    {Object.entries(detail.quote_summary).map(([key, value]) => (
                      <li key={key}>{key}: {quoteSummaryValue(value)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail?.quote_expiry_at ? <div>Quote expiry: {detail.quote_expiry_at}</div> : null}
              {detail?.underwriter_ref ? <div>Underwriter ref: {detail.underwriter_ref}</div> : null}
              {detail?.coverage_amount != null ? <div>Coverage amount: {detail.coverage_amount}</div> : null}
              <div>Days in stage: {detail?.updated_at ? dayDiff(detail.updated_at) : "—"}</div>
              <div>Quick actions: Request docs · Escalate · Contact broker</div>
            </div>
          ) : null}

          {tab === "application" ? <pre>{JSON.stringify(detail?.submitted_data ?? {}, null, 2)}</pre> : null}

          {tab === "documents" ? (
            documentsQuery.data?.length ? (
              <ul className="space-y-2">
                {(documentsQuery.data ?? []).map((doc) => (
                  <li key={doc.id}>
                    <a className="text-brand-primary underline" href={doc.url} target="_blank" rel="noreferrer">{doc.file_name}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <div>No documents available for this application.</div>
            )
          ) : null}

          {tab === "requirements" ? (
            <ul className="space-y-2">
              {requirements.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  <div className="flex gap-2">
                    {(["received", "waived", "rejected"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`btn btn-sm ${item.status === status ? "btn--active" : ""}`}
                        onClick={() => void 0}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {tab === "requirement_history" ? (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th align="left">Date</th>
                  <th align="left">Requirement</th>
                  <th align="left">Old Status</th>
                  <th align="left">New Status</th>
                </tr>
              </thead>
              <tbody>
                {(requirementHistoryQuery.data ?? []).map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.changed_at}</td>
                    <td>{entry.requirement}</td>
                    <td>{entry.old_status ?? "—"}</td>
                    <td>{entry.new_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {tab === "pgi_comms" ? (
            <div className="space-y-3">
              <div>Quote details: {quoteSummaryValue(detail?.quote_summary)}</div>
              <div>Underwriter ref: {detail?.underwriter_ref ?? "—"}</div>
              <div>Quote expiry countdown: {quoteCountdown}</div>
              <button type="button" className="btn-primary">Bind</button>
            </div>
          ) : null}

          {tab === "notes" ? (
            <ul className="space-y-2">
              {(detail?.notes ?? []).map((note) => (
                <li key={note.id}>{note.created_at}: {note.text}</li>
              ))}
            </ul>
          ) : null}

          {tab === "activity" ? (
            <ul className="space-y-2">
              {(activityQuery.data ?? []).map((item) => (
                <li key={item.id}>{item.timestamp} · {item.actor} · {item.event_type} · {item.summary}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default BIApplicationDrawer;
