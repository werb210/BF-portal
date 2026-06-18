import { useEffect, useState } from "react";
import { api } from "@/api";

// #47 + #50 — surface the owner/guarantor (personal_net_worth) and advisor
// (professional_advisors) data the applicant already submitted, on the CRM
// contact. Read-only; both come from the existing form-responses endpoint
// keyed by the contact's linked application. 404 = not started => hidden.

const ADVISOR_ROLES: Array<{ key: string; label: string }> = [
  { key: "cpa", label: "Accountant" },
  { key: "attorney", label: "Lawyer" },
  { key: "insurance", label: "Insurance" },
  { key: "ar_credit_insurance", label: "A/R Credit Insurance" },
];

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getDoc(appId: string, docType: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await api.get<{ item?: { data?: Record<string, unknown> | null } }>(
      `/api/applications/${encodeURIComponent(appId)}/form-responses/${encodeURIComponent(docType)}`
    );
    return r?.item?.data ?? null;
  } catch {
    return null;
  }
}

export default function ContactApplicationDetails({ applicationIds }: { applicationIds?: string[] }) {
  const appId = applicationIds?.[0] ?? null;
  const [owners, setOwners] = useState<Record<string, unknown> | null>(null);
  const [advisors, setAdvisors] = useState<Record<string, Record<string, unknown>> | null>(null);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;
    (async () => {
      const [pnw, adv] = await Promise.all([
        getDoc(appId, "personal_net_worth"),
        getDoc(appId, "professional_advisors"),
      ]);
      if (cancelled) return;
      setOwners(pnw);
      setAdvisors(((adv?.advisors as Record<string, Record<string, unknown>>) ?? null));
    })();
    return () => { cancelled = true; };
  }, [appId]);

  if (!appId) return null;

  const ownerFields = owners
    ? Object.entries(owners).filter(([, v]) => v != null && String(v).trim() !== "")
    : [];

  const advisorRows = advisors
    ? ADVISOR_ROLES
        .map((r) => ({ ...r, v: (advisors[r.key] ?? {}) as Record<string, unknown> }))
        .filter((r) => [r.v.firm, r.v.contact, r.v.email, r.v.phone].some((x) => String(x ?? "").trim() !== ""))
    : [];

  if (ownerFields.length === 0 && advisorRows.length === 0) return null;

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
      {ownerFields.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Owner / Guarantor</div>
          {ownerFields.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, padding: "2px 0" }}>
              <span style={{ color: "#6b7280" }}>{humanize(k)}</span>
              <span style={{ color: "#111827", textAlign: "right" }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      {advisorRows.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Advisors</div>
          {advisorRows.map((r) => (
            <div key={r.key} style={{ fontSize: 13, padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontWeight: 600, color: "#111827" }}>{r.label}{r.v.firm ? ` — ${String(r.v.firm)}` : ""}</div>
              {r.v.contact ? <div style={{ color: "#374151" }}>{String(r.v.contact)}</div> : null}
              {r.v.email ? <div style={{ color: "#0091ae" }}>{String(r.v.email)}</div> : null}
              {r.v.phone ? <div style={{ color: "#374151" }}>{String(r.v.phone)}</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
