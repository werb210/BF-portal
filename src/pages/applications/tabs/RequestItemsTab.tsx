// BF_PORTAL_BLOCK_v821_REQUEST_ITEMS_TAB — staff checks any of the canonical 13
// documents + 7 forms; "Request from Client" POSTs to /api/applications/:id/
// request-steps, which posts CMP task buttons + one SMS and advances the card to
// "Additional Steps Required". Docs go as free-text in `documents[]`; forms map
// to the endpoint's fixed form ids.
import { useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { api } from "@/api";

interface Props { applicationId?: string }

// Canonical 13 staff document labels (exact).
const DOCUMENTS: string[] = [
  "3 years accountant prepared financials",
  "3 years business tax returns",
  "PnL – Interim financials",
  "Balance Sheet – Interim financials",
  "A/R",
  "A/P",
  "2 pieces of Government Issued ID",
  "VOID cheque or PAD",
  "2 years personal tax returns (T1 generals)",
  "Corporate structure / org chart",
  "Business plan / projections",
  "Lease agreement (if applicable)",
  "Other",
];

// 7 form items (exact labels) -> endpoint form ids.
const FORMS: Array<{ id: string; label: string }> = [
  { id: "networth", label: "Personal net worth" },
  { id: "debt", label: "Debt stack" },
  { id: "flinks", label: "Banking connection (Flinks view-only)" },
  { id: "cra", label: "CRA view-only access" },
  { id: "realestate", label: "Real estate collateral" },
  { id: "equipment", label: "Equipment collateral" },
  { id: "advisors", label: "Professional advisors (CPA / lawyer / insurance)" },
];

export default function RequestItemsTab({ applicationId }: Props) {
  const [docs, setDocs] = useState<Set<string>>(new Set());
  const [forms, setForms] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!applicationId) return <div className="ui-empty">Select an application to request items.</div>;

  const toggle = (set: Dispatch<SetStateAction<Set<string>>>, key: string) =>
    set((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const total = docs.size + forms.size;

  const submit = async () => {
    if (total === 0) { setError("Check at least one document or form."); return; }
    setBusy(true); setError(null); setDone(null);
    try {
      await api.post(`/api/applications/${applicationId}/request-steps`, {
        forms: Array.from(forms),
        documents: Array.from(docs),
      });
      setDone(`Requested ${total} item${total === 1 ? "" : "s"} from the client.`);
      setDocs(new Set()); setForms(new Set());
    } catch (e: any) {
      setError(e?.message || "Failed to send request.");
    } finally {
      setBusy(false);
    }
  };

  // BF_PORTAL_BLOCK_v834_REQUEST_ITEMS_COLOR_AND_LAYOUT — explicit dark text so
  // labels are never white-on-white in the dark-themed shell.
  const chip = (active: boolean): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
    border: `1px solid ${active ? "#2563eb" : "#e2e8f0"}`, borderRadius: 8,
    background: active ? "#eff6ff" : "#fff", cursor: "pointer", fontSize: 14,
    color: "#0f172a",
  });

  return (
    <div style={{ maxWidth: 1100 }}>
      <h3 style={{ margin: "4px 0 4px" }}>Request Items</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Check the documents and forms you need. The client receives each as a task
        in their portal (with one SMS), and the application moves to “Additional Steps Required”.
      </p>

      {/* BF_PORTAL_BLOCK_v834_REQUEST_ITEMS_COLOR_AND_LAYOUT — 3 columns:
          required documents fill the left two columns, forms sit in the
          third column on the right. */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", fontWeight: 700, margin: "16px 0 8px" }}>
            Required documents
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {DOCUMENTS.map((d) => (
              <div key={d} onClick={() => toggle(setDocs, d)} style={chip(docs.has(d))}>
                <input type="checkbox" readOnly checked={docs.has(d)} /> <span style={{ color: "#0f172a" }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", fontWeight: 700, margin: "16px 0 8px" }}>
            Forms
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            {FORMS.map((f) => (
              <div key={f.id} onClick={() => toggle(setForms, f.id)} style={chip(forms.has(f.id))}>
                <input type="checkbox" readOnly checked={forms.has(f.id)} /> <span style={{ color: "#0f172a" }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>{error}</div>}
      {done && <div style={{ color: "#16a34a", fontSize: 13, marginTop: 12 }}>{done}</div>}

      <div style={{ marginTop: 20 }}>
        <button
          onClick={submit}
          disabled={busy || total === 0}
          style={{
            padding: "10px 18px", borderRadius: 8, border: "none",
            background: busy || total === 0 ? "#93c5fd" : "#2563eb", color: "#fff",
            fontWeight: 600, cursor: busy || total === 0 ? "default" : "pointer",
          }}
        >
          {busy ? "Sending…" : `Request from Client${total ? ` (${total})` : ""}`}
        </button>
      </div>
    </div>
  );
}
