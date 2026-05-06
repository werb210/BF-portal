// BI_PIPELINE_ALIGN_v57 — PGI fields + Submit-to-Carrier.
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";
import type { BiApplicationDetailData } from "../BIApplicationDetail";

export default function ApplicationTab({ app, onMutated }: { app: BiApplicationDetailData; onMutated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const d = app.data || {};
  // BF_PORTAL_BLOCK_v169_BI_SUBMIT_BUTTON_GATE_v1
  // V1 spec §7 + v160 server gate: Submit-to-Carrier surfaces on
  // document_review (after staff accept all docs), not under_review
  // (which is a post-submit PGI lifecycle stage).
  const canSubmit = app.source_type === "public" && (app.stage as string) === "document_review" && app.all_docs_accepted && !app.submission_locked;
  async function submitToCarrier() { if (!confirm("Submit this application to the carrier? The application will be locked.")) return; setSubmitting(true); try { await api(`/api/v1/bi/applications/${app.id}/submit-to-carrier`, { method: "POST" }); toast.success("Submitted to carrier"); onMutated(); } catch (e) { toast.error(e instanceof Error ? e.message : "Submit failed"); } finally { setSubmitting(false); } }
  return <div className="grid gap-6 md:grid-cols-2"><div className="md:col-span-full">{canSubmit && <button onClick={submitToCarrier} disabled={submitting} className="rounded bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{submitting ? "Submitting…" : "Submit to Carrier"}</button>}</div><pre className="md:col-span-full rounded bg-black/30 p-3 text-xs">{JSON.stringify(d, null, 2)}</pre></div>;
}
