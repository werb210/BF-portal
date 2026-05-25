// BF_PORTAL_BLOCK_v629_BI_PURBECK_RENDER_v1
import { useState } from "react";

export function SendToPurbeckGate({
  applicationId, status, pgiApplicationId, loanAgreementUploadedAt,
}: {
  applicationId: string;
  status?: string;
  pgiApplicationId: string | null;
  loanAgreementUploadedAt: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const alreadySubmitted = !!pgiApplicationId;
  const hasLoanAgreement = !!loanAgreementUploadedAt;
  const disabled = alreadySubmitted || !hasLoanAgreement || submitting;

  async function handleSend() {
    setError(null);
    setFieldErrors({});
    setSuccess(null);
    setSubmitting(true);
    try {
      const r = await fetch(`/api/v1/bi/applications/${applicationId}/submit-to-pgi`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const body = await r.json().catch(() => ({}));
      if (r.status === 412) {
        setError(body.message || "Loan agreement document required before Purbeck submission.");
      } else if (r.status === 400 && body.errors) {
        setFieldErrors(body.errors);
        setError("Carrier rejected the submission. See field errors below.");
      } else if (r.ok && body.pgi_application_id) {
        setSuccess(`Submitted. PGI application ID: ${body.pgi_application_id}`);
      } else {
        setError(body.error || body.detail || `Submit failed (HTTP ${r.status})`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded border border-gray-200 p-3">
      <h3 className="font-semibold mb-2">Send to Purbeck</h3>
      {alreadySubmitted && (
        <div className="text-sm text-green-700 bg-green-50 p-2 rounded mb-2">
          Already submitted. PGI application ID: <strong>{pgiApplicationId}</strong>
        </div>
      )}
      {!alreadySubmitted && !hasLoanAgreement && (
        <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded mb-2">
          <strong>Loan agreement required before Purbeck submission.</strong>
          <p className="mt-1">Upload a loan_agreement document (PDF, DOCX, XLS, XLSX, CSV, or Markdown — 5MB max, no images) on the Documents tab to enable the send button.</p>
        </div>
      )}
      <button
        onClick={handleSend}
        disabled={disabled}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-40"
      >
        {submitting ? "Submitting…" : alreadySubmitted ? "Already submitted" : "Send to Purbeck"}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {Object.keys(fieldErrors).length > 0 && (
        <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
          <strong className="text-sm text-red-700">Carrier field errors:</strong>
          <ul className="list-disc pl-5 text-xs text-red-700 mt-1">
            {Object.entries(fieldErrors).map(([k, v]) => <li key={k}><code>{k}</code>: {v}</li>)}
          </ul>
          <p className="text-xs text-gray-600 mt-1">Fix on the Application tab and resubmit (each retry creates a new PGI app record — no deduping carrier-side).</p>
        </div>
      )}
      {success && <p className="text-sm text-green-700 mt-2">{success}</p>}
    </section>
  );
}
