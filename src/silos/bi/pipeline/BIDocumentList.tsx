import { useEffect, useState } from "react";
import { api } from "@/api";
import Modal from "@/components/ui/Modal";

type BIDoc = {
  id: string;
  doc_type: string;
  original_filename: string;
  review_status?: "pending" | "accepted" | "rejected" | null;
  rejection_reason?: string | null;
  created_at: string;
  uploaded_by_actor?: string | null;
};

export default function BIDocumentList({ applicationId }: { applicationId: string }) {
  const [docs, setDocs] = useState<BIDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ type: "accept" | "reject"; doc: BIDoc } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [applicationId]);

  async function load() {
    setLoading(true);
    try {
      const data = await api<BIDoc[]>(`/api/v1/bi/applications/${applicationId}/documents`);
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!active) return;
    if (active.type === "reject" && !reason.trim()) {
      setErr("Rejection reason is required.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const path =
        active.type === "accept"
          ? `/api/v1/bi/documents/${active.doc.id}/accept`
          : `/api/v1/bi/documents/${active.doc.id}/reject`;
      await api(path, {
        method: "POST",
        body: active.type === "reject" ? JSON.stringify({ reason: reason.trim() }) : undefined
      });
      setActive(null);
      setReason("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to update status.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div>Loading documents…</div>;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Documents</h3>
      {docs.length === 0 && <div className="text-sm">No documents uploaded.</div>}
      {docs.map((d) => {
        const status = d.review_status || "pending";
        const isAccepted = status === "accepted";
        const isRejected = status === "rejected";
        return (
          <div
            key={d.id}
            className="bg-brand-surface border border-card rounded-xl p-4 mb-3 flex items-center justify-between gap-4"
          >
            <div>
              <div className="font-medium">{d.original_filename}</div>
              <div className="text-xs text-white/60">
                {d.doc_type} · {new Date(d.created_at).toLocaleString()}
                {d.uploaded_by_actor ? ` · by ${d.uploaded_by_actor}` : ""}
              </div>
              {isRejected && d.rejection_reason && (
                <div className="text-xs text-red-300 mt-1">Rejected: {d.rejection_reason}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`doc-status doc-status--${status}`}>{status}</span>
              <button
                type="button"
                className="bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-10 px-4 font-medium disabled:opacity-50"
                disabled={isAccepted}
                onClick={() => setActive({ type: "accept", doc: d })}
              >
                Accept
              </button>
              <button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white rounded-full h-10 px-4 font-medium disabled:opacity-50"
                disabled={isRejected}
                onClick={() => {
                  setActive({ type: "reject", doc: d });
                  setReason("");
                }}
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}

      {active && (
        <Modal
          title={active.type === "accept" ? "Accept document" : "Reject document"}
          onClose={() => {
            if (!submitting) {
              setActive(null);
              setReason("");
              setErr(null);
            }
          }}
          actions={
            <>
              <button
                type="button"
                className="rounded border px-4 py-2"
                onClick={() => setActive(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rounded px-4 py-2 text-white ${
                  active.type === "accept" ? "bg-brand-accent" : "bg-red-600"
                }`}
                onClick={confirm}
                disabled={submitting}
              >
                {submitting
                  ? "Saving…"
                  : active.type === "accept"
                  ? "Accept"
                  : "Reject & SMS client"}
              </button>
            </>
          }
        >
          <p>
            {active.type === "accept"
              ? `Confirm acceptance for ${active.doc.original_filename}.`
              : `Provide a rejection reason for ${active.doc.original_filename}. The client will receive an SMS with your reason and a link to re-upload.`}
          </p>
          {active.type === "reject" && (
            <div className="mt-3">
              <label className="text-sm">Rejection reason</label>
              <textarea
                className="w-full border rounded p-2 mt-1"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain what needs to be corrected."
                disabled={submitting}
              />
            </div>
          )}
          {err && <p className="text-sm text-red-300 mt-2">{err}</p>}
        </Modal>
      )}
    </div>
  );
}
