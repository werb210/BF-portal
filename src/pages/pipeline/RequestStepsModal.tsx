// BF_PORTAL_BLOCK_v793_REQUEST_STEPS_MODAL — staff picker for "Request additional
// steps". Lets staff choose Stage-2 forms and/or documents, then POSTs them to
// /api/applications/:id/request-steps, which posts CMP task buttons + one SMS and
// advances the card to "Additional Steps Required". Replaces the old button that
// only moved the stage with no client-facing tasks.
import { useState } from "react";
import { api } from "@/api";

const FORMS: Array<{ id: string; label: string }> = [
  { id: "upload", label: "Government ID" },
  { id: "flinks", label: "Connect Bank (View-Only)" },
  { id: "cra", label: "CRA Authorization" },
  { id: "networth", label: "Personal Net Worth" },
  { id: "debt", label: "Debt Stack" },
  { id: "advisors", label: "Professional Advisors" },
  { id: "realestate", label: "Real Estate Collateral" },
  { id: "equipment", label: "Equipment Collateral" },
];

const DOC_PRESETS: string[] = [
  "6 Months Bank Statements",
  "Profit & Loss Statement",
  "Balance Sheet",
  "Accounts Receivable Aging",
  "Accounts Payable Aging",
  "Tax Returns / Notice of Assessment",
  "Void Cheque",
  "Articles of Incorporation",
];

export default function RequestStepsModal({
  applicationId,
  applicationName,
  onClose,
  onDone,
}: {
  applicationId: string;
  applicationName?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [forms, setForms] = useState<Set<string>>(new Set());
  const [docs, setDocs] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleForm = (id: string) =>
    setForms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleDoc = (label: string) =>
    setDocs((prev) => (prev.includes(label) ? prev.filter((d) => d !== label) : [...prev, label]));

  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    if (!docs.includes(v)) setDocs((prev) => [...prev, v]);
    setCustom("");
  };

  const total = forms.size + docs.length;

  const submit = async () => {
    if (!total || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/applications/${applicationId}/request-steps`, {
        forms: Array.from(forms),
        documents: docs,
      });
      onDone();
      onClose();
    } catch {
      setError("Could not send the request. Please try again.");
      setBusy(false);
    }
  };

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "6px 10px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${active ? "#f97316" : "var(--ui-border)"}`,
    background: active ? "#fff7ed" : "#fff",
    color: active ? "#c2410c" : "#334155",
    userSelect: "none",
  });

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(2,8,23,0.55)", display: "grid", placeItems: "center", zIndex: 1000, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", background: "var(--ui-surface-strong)", borderRadius: 14, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--ui-text)", margin: 0 }}>Request additional steps</h2>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 20, color: "var(--ui-text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 0, marginBottom: 16 }}>
          {applicationName ? `${applicationName} — ` : ""}selected items appear as task buttons in the client portal and the client gets one text to log in and complete them.
        </p>

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ui-text-muted)", fontWeight: 700, marginBottom: 8 }}>Forms</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {FORMS.map((f) => (
            <span key={f.id} onClick={() => toggleForm(f.id)} style={chip(forms.has(f.id))}>{f.label}</span>
          ))}
        </div>

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ui-text-muted)", fontWeight: 700, marginBottom: 8 }}>Documents to upload</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {DOC_PRESETS.map((d) => (
            <span key={d} onClick={() => toggleDoc(d)} style={chip(docs.includes(d))}>{d}</span>
          ))}
        </div>
        {docs.filter((d) => !DOC_PRESETS.includes(d)).map((d) => (
          <span key={d} onClick={() => toggleDoc(d)} style={{ ...chip(true), marginRight: 8, marginBottom: 8, display: "inline-block" }}>{d} ×</span>
        ))}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <input
            value={custom}
            placeholder="Add another document…"
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 13 }}
          />
          <button onClick={addCustom} style={{ padding: "8px 14px", border: "1px solid var(--ui-border)", borderRadius: 8, background: "var(--ui-surface-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--ui-text)" }}>Add</button>
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 10px" }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} disabled={busy} style={{ padding: "9px 16px", border: "1px solid var(--ui-border)", borderRadius: 8, background: "var(--ui-surface-strong)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--ui-text)" }}>Cancel</button>
          <button
            onClick={submit}
            disabled={!total || busy}
            style={{ padding: "9px 18px", border: "none", borderRadius: 8, background: total && !busy ? "#f97316" : "#fdba74", color: "#fff", fontSize: 13, fontWeight: 700, cursor: total && !busy ? "pointer" : "not-allowed" }}
          >
            {busy ? "Sending…" : total ? `Send request (${total})` : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}

