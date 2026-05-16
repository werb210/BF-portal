// BF_PORTAL_BLOCK_BI_ROUND8_DETAIL_v1 -- Requirements tab.
// Per-product required-docs checklist with OCR-field preview.
// Source-type-aware accept/reject controls.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api";

type Requirement = {
  category: string;
  label: string;
  required: boolean;
  documents: Array<{
    id: string;
    filename: string;
    status: "pending" | "accepted" | "rejected";
    uploaded_at: string;
    ocr_fields?: Record<string, unknown> | null;
    rejection_reason?: string | null;
  }>;
};

type Props = {
  applicationId: string;
  sourceType: "public" | "lender" | "referrer";
  readOnly: boolean;
};

export default function RequirementsTab({ applicationId, sourceType, readOnly }: Props) {
  const [reqs, setReqs] = useState<Requirement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ requirements: Requirement[] }>(`/api/v1/bi/applications/${applicationId}/requirements`);
      setReqs(r.requirements || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requirements");
    }
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    if (!reqs) return null;
    const required = reqs.filter((r) => r.required).length;
    const accepted = reqs.filter((r) => r.required && r.documents.some((d) => d.status === "accepted")).length;
    return { required, accepted };
  }, [reqs]);

  const act = async (docId: string, action: "accept" | "reject") => {
    if (readOnly) return;
    const reason = action === "reject" ? prompt("Rejection reason (required):") : null;
    if (action === "reject" && !reason) return;
    setActing(docId);
    try {
      await api(`/api/v1/bi/applications/${applicationId}/documents/${docId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : `${action} failed`);
    } finally {
      setActing(null);
    }
  };

  if (error) return <p className="text-sm text-red-300">{error}</p>;
  if (!reqs) return <p className="text-sm text-white/60">Loading requirements…</p>;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="text-xs text-white/60">
          {summary.accepted} of {summary.required} required documents accepted
          {readOnly && " • view-only (auto-forwarded to carrier)"}
        </div>
      )}
      {reqs.length === 0 && <p className="text-sm italic text-white/50">No requirements defined for this product yet.</p>}
      {reqs.map((req) => {
        const hasAccepted = req.documents.some((d) => d.status === "accepted");
        return (
          <div key={req.category} className="rounded-xl border border-card bg-brand-bgAlt p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong className="text-sm">{req.label}</strong>
                {req.required && <span className="ml-2 text-[10px] text-amber-300">REQUIRED</span>}
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] ${
                  hasAccepted
                    ? "bg-emerald-500/20 text-emerald-200"
                    : req.documents.length > 0
                      ? "bg-amber-500/20 text-amber-200"
                      : "bg-slate-500/20 text-slate-300"
                }`}
              >
                {hasAccepted ? "Accepted" : req.documents.length > 0 ? "Pending review" : "Missing"}
              </span>
            </div>
            {req.documents.length === 0 ? (
              <p className="text-xs italic text-white/40">No uploads yet.</p>
            ) : (
              <ul className="space-y-2">
                {req.documents.map((doc) => (
                  <li key={doc.id} className="rounded-lg border border-card bg-brand-surface p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm">{doc.filename}</div>
                        <div className="text-[10px] text-white/40">Uploaded {new Date(doc.uploaded_at).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] ${
                            doc.status === "accepted"
                              ? "bg-emerald-500/20 text-emerald-200"
                              : doc.status === "rejected"
                                ? "bg-rose-500/20 text-rose-200"
                                : "bg-slate-500/20 text-slate-300"
                          }`}
                        >
                          {doc.status}
                        </span>
                        {!readOnly && doc.status === "pending" && (
                          <>
                            <button
                              disabled={acting === doc.id}
                              onClick={() => void act(doc.id, "accept")}
                              className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/30"
                            >
                              Accept
                            </button>
                            <button
                              disabled={acting === doc.id}
                              onClick={() => void act(doc.id, "reject")}
                              className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/30"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {doc.rejection_reason && <div className="mt-2 text-xs italic text-rose-200/80">Rejected: {doc.rejection_reason}</div>}
                    {doc.ocr_fields && Object.keys(doc.ocr_fields).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-white/60 hover:text-white">OCR fields</summary>
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          {Object.entries(doc.ocr_fields).map(([k, v]) => (
                            <div key={k} className="contents">
                              <dt className="text-white/50">{k}</dt>
                              <dd className="truncate text-white/80">{String(v ?? "—")}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {sourceType === "public" && !readOnly && (
        <p className="text-xs italic text-white/40">When the last required document is accepted, the application auto-forwards to the carrier.</p>
      )}
    </div>
  );
}
