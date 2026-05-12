// BF_PORTAL_BLOCK_v196_UNDERWRITING_BANNER_v1
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";
import type { BiApplicationDetailData } from "../BIApplicationDetail";

function fmtMoney(n: number | string | null | undefined): string | null {
  const num = typeof n === "string" ? Number(n) : n;
  if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) return null;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(num);
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString();
}

function DecisionBanner({ app }: { app: BiApplicationDetailData }) {
  const stage = String(app.stage || "");
  const premium = fmtMoney(app.annual_premium ?? null);
  const validUntil = fmtDate(app.quote_valid_until ?? null);
  const bound = fmtDate(app.policy_bound_at ?? null);

  if (stage === "policy_issued") {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-emerald-300">Policy bound</div>
        <div className="mt-1 text-lg font-semibold text-white">🛡 Policy issued by carrier</div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm text-white/80">
          {premium && <div><span className="text-white/60">Annual premium</span><div className="font-semibold text-white">{premium}</div></div>}
          {app.policy_id && <div><span className="text-white/60">Policy id</span><div className="font-mono text-xs">{app.policy_id}</div></div>}
          {bound && <div><span className="text-white/60">Bound</span><div>{bound}</div></div>}
        </div>
      </div>
    );
  }

  if (stage === "approved") {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-emerald-300">Approved by carrier</div>
        <div className="mt-1 text-lg font-semibold text-white">✓ Approved — waiting on policy binding</div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm text-white/80">
          {premium && <div><span className="text-white/60">Annual premium</span><div className="font-semibold text-white">{premium}</div></div>}
          {app.quote_id && <div><span className="text-white/60">Quote</span><div className="font-mono text-xs">{app.quote_id}</div></div>}
          {app.underwriter_ref && <div><span className="text-white/60">Underwriter</span><div className="font-mono text-xs">{app.underwriter_ref}</div></div>}
        </div>
      </div>
    );
  }

  if (stage === "under_review" && premium) {
    return (
      <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-blue-300">Quoted</div>
        <div className="mt-1 text-lg font-semibold text-white">Quote returned — under review</div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm text-white/80">
          <div><span className="text-white/60">Annual premium</span><div className="font-semibold text-white">{premium}</div></div>
          {app.quote_id && <div><span className="text-white/60">Quote</span><div className="font-mono text-xs">{app.quote_id}</div></div>}
          {validUntil && <div><span className="text-white/60">Valid until</span><div>{validUntil}</div></div>}
        </div>
      </div>
    );
  }

  if (stage === "declined") {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-red-300">Declined</div>
        <div className="mt-1 text-lg font-semibold text-white">✗ Carrier declined this application</div>
        {app.score_reason && (
          <div className="mt-2 text-sm text-white/80">
            <span className="text-white/60">Reason:</span>
            <div className="mt-1 italic">{app.score_reason}</div>
          </div>
        )}
      </div>
    );
  }

  if (stage === "information_required") {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="text-xs uppercase tracking-widest text-amber-200">Information required</div>
        <div className="mt-1 text-lg font-semibold text-white">ℹ Carrier requested more information</div>
        {app.score_reason && (
          <div className="mt-2 text-sm text-white/80">
            <span className="text-white/60">What they need:</span>
            <div className="mt-1 italic">{app.score_reason}</div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function ApplicationTab({ app, onMutated }: { app: BiApplicationDetailData; onMutated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const d = app.data || {};
  const canSubmit =
    app.source_type === "public" &&
    (app.stage as string) === "document_review" &&
    app.all_docs_accepted &&
    !app.submission_locked;
  async function submitToCarrier() {
    if (!confirm("Submit this application to the carrier? The application will be locked.")) return;
    setSubmitting(true);
    try {
      await api(`/api/v1/bi/applications/${app.id}/submit-to-carrier`, { method: "POST" });
      toast.success("Submitted to carrier");
      onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="space-y-6">
      <DecisionBanner app={app} />
      {canSubmit && (
        <button
          onClick={submitToCarrier}
          disabled={submitting}
          className="rounded bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit to Carrier"}
        </button>
      )}
      <pre className="rounded bg-black/30 p-3 text-xs">{JSON.stringify(d, null, 2)}</pre>
    </div>
  );
}
