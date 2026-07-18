// BF_PORTAL_BLOCK_v759_CONTACT_CSV_IMPORT — import contacts from a HubSpot
// (or any) CSV export. Parses the file in the browser, auto-maps columns to
// BF contact fields with manual override, previews, and POSTs the mapped rows
// to /api/crm/contacts/import (upsert by email).
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { api } from "@/api";

type Field =
  | "first_name"
  | "last_name"
  | "name"
  | "email"
  | "phone"
  | "company_name"
  | "job_title"
  | "lead_status";

const FIELDS: { key: Field; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "name", label: "Full name (used if no first/last)" },
  { key: "phone", label: "Phone" },
  { key: "company_name", label: "Company" },
  { key: "job_title", label: "Job title" },
  { key: "lead_status", label: "Lead status" },
];

// Minimal RFC-4180 CSV parser: handles quoted fields, embedded commas/newlines,
// escaped double-quotes, and CRLF or LF line endings.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      pushField();
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

function guess(header: string): Field | "" {
  const h = header.toLowerCase().replace(/[^a-z]/g, "");
  if (h.includes("email")) return "email";
  if (h.includes("firstname") || h === "first") return "first_name";
  if (h.includes("lastname") || h === "last" || h.includes("surname")) return "last_name";
  if (h.includes("jobtitle") || h === "title" || h.includes("position")) return "job_title";
  if (h.includes("company") || h.includes("organization") || h.includes("organisation")) return "company_name";
  if (h.includes("phone") || h.includes("mobile") || h.includes("tel")) return "phone";
  if (h.includes("leadstatus") || h.includes("status") || h.includes("stage")) return "lead_status";
  if (h.includes("fullname") || h === "name" || h === "contact") return "name";
  return "";
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};
const card: CSSProperties = {
  background: "var(--ui-surface-strong)",
  borderRadius: 12,
  width: "min(720px, 100%)",
  maxHeight: "90vh",
  overflow: "auto",
  padding: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};
const btnPrimary: CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  padding: "9px 16px",
  borderRadius: 8,
  fontWeight: 600,
  border: 0,
  cursor: "pointer",
};
const btnGhost: CSSProperties = {
  background: "var(--ui-surface-strong)",
  border: "1px solid var(--ui-border)",
  padding: "9px 16px",
  borderRadius: 8,
  cursor: "pointer",
};

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
};

export default function ImportContactsModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<Field, number>>(
    () => Object.fromEntries(FIELDS.map((f) => [f.key, -1])) as Record<Field, number>,
  );
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [smsConsent, setSmsConsent] = useState(false); // BF_PORTAL_IMPORT_CONSENT_v1
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setErr(null);
    setResult(null);
    try {
      const text = await file.text();
      const grid = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
      if (grid.length < 2) {
        setErr("That CSV needs a header row and at least one contact.");
        return;
      }
      const hdr = (grid[0] ?? []).map((h) => h.trim());
      setHeaders(hdr);
      setDataRows(grid.slice(1));
      setFileName(file.name);
      const m = Object.fromEntries(FIELDS.map((f) => [f.key, -1])) as Record<Field, number>;
      hdr.forEach((h, idx) => {
        const g = guess(h);
        if (g && m[g] === -1) m[g] = idx;
      });
      setMapping(m);
    } catch {
      setErr("Could not read that file. Make sure it's a .csv export.");
    }
  };

  const rows = useMemo(() => {
    return dataRows.map((r) => {
      const o: Record<string, string> = {};
      for (const f of FIELDS) {
        const ci = mapping[f.key];
        if (ci >= 0) o[f.key] = (r[ci] ?? "").trim();
      }
      return o;
    });
  }, [dataRows, mapping]);

  const mappedAny = useMemo(() => Object.values(mapping).some((v) => v >= 0), [mapping]);

  const doImport = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<ImportResult>("/api/crm/contacts/import", { rows, smsConsentExpress: smsConsent }); // BF_PORTAL_IMPORT_CONSENT_v1
      setResult(res);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "var(--ui-text)" }}>Import contacts from CSV</h2>
          <button
            onClick={onClose}
            style={{ border: 0, background: "transparent", fontSize: 22, cursor: "pointer", color: "var(--ui-text-muted)" }}
          >
            ×
          </button>
        </div>

        {result ? (
          <div>
            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: 8,
                padding: 16,
                color: "#065f46",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Import complete</div>
              <div>
                {result.created} created · {result.updated} updated · {result.skipped} skipped (of {result.total})
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button style={btnPrimary} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : headers.length === 0 ? (
          <div>
            <p style={{ color: "var(--ui-text-muted)", fontSize: 14, marginTop: 0 }}>
              In HubSpot: Contacts → Export → CSV. Then choose that file here. We match on email — existing contacts
              are updated, new ones are created, and they&apos;ll be assigned to you.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <button style={btnPrimary} onClick={() => fileRef.current?.click()}>Choose CSV file…</button>
            {err && <div style={{ color: "#b91c1c", marginTop: 12, fontSize: 13 }}>{err}</div>}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "var(--ui-text-muted)", marginBottom: 12 }}>
              <strong>{fileName}</strong> — {dataRows.length} rows. Confirm how columns map:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {FIELDS.map((f) => (
                <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                  <span style={{ color: "var(--ui-text)", fontWeight: 600 }}>{f.label}</span>
                  <select
                    value={mapping[f.key]}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: Number(e.target.value) }))}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--ui-border)" }}
                  >
                    <option value={-1}>— not imported —</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `Column ${idx + 1}`}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 6 }}>Preview (first 3):</div>
            <div style={{ border: "1px solid var(--ui-border)", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              {rows.slice(0, 3).map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 12px",
                    borderTop: idx ? "1px solid var(--ui-surface-muted)" : 0,
                    fontSize: 13,
                    color: "var(--ui-text)",
                  }}
                >
                  {[r.first_name, r.last_name].filter(Boolean).join(" ") || r.name || "(no name)"} ·{" "}
                  {r.email || "(no email)"} · {r.company_name || ""}
                </div>
              ))}
            </div>

            {err && <div style={{ color: "#b91c1c", marginBottom: 12, fontSize: 13 }}>{err}</div>}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {/* BF_PORTAL_IMPORT_CONSENT_v1 - stamp express SMS/email consent on import */}
              <label style={{ flexBasis: "100%", display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 6 }}>
                <input type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} />
                These contacts gave express SMS/email consent (application terms) - mark them SMS-marketable
              </label>
              <button
                style={btnGhost}
                onClick={() => {
                  setHeaders([]);
                  setDataRows([]);
                  setFileName("");
                }}
              >
                Choose a different file
              </button>
              <button
                style={{ ...btnPrimary, opacity: busy || !mappedAny ? 0.6 : 1 }}
                disabled={busy || !mappedAny}
                onClick={doImport}
              >
                {busy ? "Importing…" : `Import ${dataRows.length} contacts`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
