// BF_PORTAL_REQUEST_ITEMS_DYNAMIC_v2 — The full fixed document catalog is ALWAYS shown. The
// documents this deal's Step-5 resolved required set asks for are pre-checked; an ADMIN
// unchecking a pre-checked (required) document waives it for this application (removes it from
// the client's upload list + the Send/SignNow block). Catalog documents NOT in the Step-5 set
// are shown unchecked and can be checked to also request them. Any required item not in the
// catalog (e.g. banking statements) is appended so it stays visible. Forms + "Request from
// Client" (POST /api/applications/:id/request-steps) unchanged.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { api } from "@/api";
import { useAuth } from "@/hooks/useAuth";
import { resolveUserRole } from "@/utils/roles";

interface Props { applicationId?: string }
type ReqDoc = { document_type: string; label: string };

const CATALOG_DOCS: string[] = [
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

const FORMS: Array<{ id: string; label: string }> = [
  { id: "networth", label: "Personal net worth" },
  { id: "debt", label: "Debt stack" },
  { id: "flinks", label: "Banking connection (Flinks view-only)" },
  { id: "cra", label: "CRA view-only access" },
  { id: "realestate", label: "Real estate collateral" },
  { id: "equipment", label: "Equipment collateral" },
  { id: "advisors", label: "Professional advisors (CPA / lawyer / insurance)" },
];

const norm = (s: string) => String(s ?? "").trim().toLowerCase();

type DocItem = { label: string; documentType: string | null; isRequired: boolean };

export default function RequestItemsTab({ applicationId }: Props) {
  const { user } = useAuth();
  const isAdmin =
    resolveUserRole((user as { role?: string | null } | null)?.role ?? null) === "Admin";

  const [required, setRequired] = useState<ReqDoc[]>([]);
  const [waived, setWaived] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<Set<string>>(new Set()); // optional docs, by norm(label)
  const [forms, setForms] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [waiveBusy, setWaiveBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    api
      .get(`/api/portal/applications/${applicationId}/request-items`)
      .then((r: any) => {
        if (cancelled) return;
        setRequired(Array.isArray(r?.required) ? r.required : []);
        setWaived(new Set((Array.isArray(r?.waived) ? r.waived : []).map(norm)));
      })
      .catch(() => {
        if (cancelled) return;
        setRequired([]);
        setWaived(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (!applicationId)
    return <div className="ui-empty">Select an application to request items.</div>;

  const requiredByKey = new Map<string, ReqDoc>();
  required.forEach((r) => {
    requiredByKey.set(norm(r.label), r);
    requiredByKey.set(norm(r.document_type), r);
  });

  const catalogNorm = new Set(CATALOG_DOCS.map(norm));
  const seenExtra = new Set<string>();
  const extra = required.filter((r) => {
    if (catalogNorm.has(norm(r.label)) || catalogNorm.has(norm(r.document_type))) return false;
    const k = norm(r.document_type);
    if (seenExtra.has(k)) return false;
    seenExtra.add(k);
    return true;
  });

  const docItems: DocItem[] = [
    ...CATALOG_DOCS.map((label) => {
      const r = requiredByKey.get(norm(label));
      return { label, documentType: r?.document_type ?? null, isRequired: !!r };
    }),
    ...extra.map((r) => ({ label: r.label, documentType: r.document_type, isRequired: true })),
  ];

  const isChecked = (it: DocItem) =>
    it.isRequired && it.documentType
      ? !waived.has(norm(it.documentType))
      : manual.has(norm(it.label));

  const onToggleDoc = async (it: DocItem) => {
    if (it.isRequired && it.documentType) {
      if (!isAdmin || waiveBusy) return;
      const dt = it.documentType;
      const key = norm(dt);
      const currentlyChecked = !waived.has(key);
      setWaiveBusy(dt);
      setError(null);
      setDone(null);
      setWaived((prev) => {
        const next = new Set(prev);
        if (currentlyChecked) next.add(key);
        else next.delete(key);
        return next;
      });
      try {
        if (currentlyChecked) {
          await api.post(`/api/portal/applications/${applicationId}/document-waivers`, {
            document_type: dt,
          });
        } else {
          await api.delete(
            `/api/portal/applications/${applicationId}/document-waivers/${encodeURIComponent(dt)}`,
          );
        }
      } catch (e: any) {
        setWaived((prev) => {
          const next = new Set(prev);
          if (currentlyChecked) next.delete(key);
          else next.add(key);
          return next;
        });
        setError(e?.message || "Failed to update waiver.");
      } finally {
        setWaiveBusy(null);
      }
    } else {
      setManual((prev) => {
        const next = new Set(prev);
        const k = norm(it.label);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
    }
  };

  const toggleForm = (key: string) =>
    setForms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const checkedDocs = docItems.filter(isChecked);
  const total = checkedDocs.length + forms.size;

  const submit = async () => {
    if (total === 0) {
      setError("Check at least one document or form.");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await api.post(`/api/applications/${applicationId}/request-steps`, {
        forms: Array.from(forms),
        documents: checkedDocs.map((d) => d.label),
      });
      setDone(`Requested ${total} item${total === 1 ? "" : "s"} from the client.`);
      setForms(new Set());
      setManual(new Set());
    } catch (e: any) {
      setError(e?.message || "Failed to send request.");
    } finally {
      setBusy(false);
    }
  };

  const chip = (active: boolean, disabled: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    border: `1px solid ${active ? "#2563eb" : "#e2e8f0"}`,
    borderRadius: 8,
    background: active ? "#eff6ff" : "#fff",
    cursor: disabled ? "default" : "pointer",
    fontSize: 14,
    color: "#0f172a",
  });

  const labelCol = "uppercase" as const;

  return (
    <div style={{ maxWidth: 1100 }}>
      <h3 style={{ margin: "4px 0 4px" }}>Request Items</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Documents this deal’s Step 5 requires are pre-checked.{" "}
        {isAdmin
          ? "Uncheck a pre-checked document to waive it for this application — it’s removed from the client’s upload list and no longer blocks sending to a lender."
          : "Only Admins can waive a required document."}{" "}
        Any other document can be checked to also request it. “Request from Client” sends the
        checked items as tasks (one SMS) and moves the card to “Additional Steps Required”.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ fontSize: 11, textTransform: labelCol, letterSpacing: 0.5, color: "#94a3b8", fontWeight: 700, margin: "16px 0 8px" }}>
            Required documents
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {docItems.map((it) => {
              const checked = isChecked(it);
              const disabled = it.isRequired ? !isAdmin || waiveBusy === it.documentType : false;
              return (
                <div
                  key={it.label}
                  onClick={() => onToggleDoc(it)}
                  style={chip(checked, disabled)}
                  title={
                    it.isRequired
                      ? isAdmin
                        ? checked
                          ? "Required for this deal — uncheck to waive"
                          : "Waived — re-check to require it again"
                        : "Required for this deal (only Admins can waive)"
                      : "Optional — check to also request from the client"
                  }
                >
                  <input type="checkbox" readOnly checked={checked} disabled={disabled} />{" "}
                  <span style={{ color: "#0f172a" }}>{it.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: labelCol, letterSpacing: 0.5, color: "#94a3b8", fontWeight: 700, margin: "16px 0 8px" }}>
            Forms
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            {FORMS.map((f) => (
              <div key={f.id} onClick={() => toggleForm(f.id)} style={chip(forms.has(f.id), false)}>
                <input type="checkbox" readOnly checked={forms.has(f.id)} />{" "}
                <span style={{ color: "#0f172a" }}>{f.label}</span>
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
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: busy || total === 0 ? "#93c5fd" : "#2563eb",
            color: "#fff",
            fontWeight: 600,
            cursor: busy || total === 0 ? "default" : "pointer",
          }}
        >
          {busy ? "Sending…" : `Request from Client${total ? ` (${total})` : ""}`}
        </button>
      </div>
    </div>
  );
}
