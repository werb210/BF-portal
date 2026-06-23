// BF_PORTAL_CRM_COMPANY_CSV_IMPORT — import companies from a CSV export.
// Parses in-browser, auto-maps columns with manual override, previews count,
// and POSTs mapped rows to /api/crm/companies/import (upsert by name within silo).
import { useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import { api } from "@/api";

type Field = "name" | "industry" | "domain" | "city" | "region" | "types_of_financing" | "tags";

const FIELDS: { key: Field; label: string }[] = [
  { key: "name", label: "Company name *" },
  { key: "industry", label: "Industry" },
  { key: "domain", label: "Website / domain" },
  { key: "city", label: "City" },
  { key: "region", label: "Province / region" },
  { key: "types_of_financing", label: "Types of financing (; or , separated)" },
  { key: "tags", label: "Tags (; or , separated)" },
];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { pushField(); i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { pushRow(); i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function autoMap(headers: string[]): Record<Field, number> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const find = (...keys: string[]) => {
    for (let h = 0; h < headers.length; h++) {
      const nh = norm(headers[h] ?? "");
      if (keys.some((k) => nh === k || nh.includes(k))) return h;
    }
    return -1;
  };
  return {
    name: find("companyname", "company", "legalname", "operatingname", "name"),
    industry: find("industry", "sector"),
    domain: find("domain", "website", "url", "web"),
    city: find("city", "town"),
    region: find("region", "province", "state"),
    types_of_financing: find("typesoffinancing", "financing", "producttype"),
    tags: find("tags", "tag", "labels"),
  };
}

export default function CompaniesImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<Field, number>>({ name: -1, industry: -1, domain: -1, city: -1, region: -1, types_of_financing: -1, tags: -1 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const all = parseCsv(text);
      if (all.length === 0) { setMsg("Empty file."); return; }
      const hs = all[0] ?? [];
      setHeaders(hs);
      setDataRows(all.slice(1));
      setMap(autoMap(hs));
      setMsg(null);
    };
    reader.readAsText(f);
  }

  const mapped = useMemo(
    () =>
      dataRows
        .map((cells) => {
          const obj: Record<string, string> = {};
          (Object.keys(map) as Field[]).forEach((k) => {
            const idx = map[k];
            if (idx >= 0) obj[k] = (cells[idx] ?? "").trim();
          });
          return obj;
        })
        .filter((o) => (o.name ?? "").trim() !== ""),
    [dataRows, map],
  );

  async function doImport() {
    if (mapped.length === 0) { setMsg("Nothing to import — map the Company name column."); return; }
    setBusy(true);
    setMsg(null);
    try {
      const r: any = await api.post("/api/crm/companies/import", { rows: mapped });
      setMsg(`Imported: ${Number(r?.created ?? 0)} new, ${Number(r?.updated ?? 0)} updated, ${Number(r?.skipped ?? 0)} skipped.`);
      onImported();
    } catch (e: any) {
      setMsg(`Import failed: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={panel}>
        <h3 style={{ margin: "0 0 12px" }}>Import companies (CSV)</h3>
        <button type="button" onClick={() => fileRef.current?.click()} style={btn}>Choose CSV…</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={onPick} />
        {headers.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 6 }}>{mapped.length} row(s) ready · map columns:</div>
            {FIELDS.map((f) => (
              <div key={f.key} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ width: 220, fontSize: 13 }}>{f.label}</span>
                <select value={map[f.key]} onChange={(e) => setMap((m) => ({ ...m, [f.key]: Number(e.target.value) }))} style={{ flex: 1, padding: 6 }}>
                  <option value={-1}>— none —</option>
                  {headers.map((h, idx) => (<option key={idx} value={idx}>{h || `Column ${idx + 1}`}</option>))}
                </select>
              </div>
            ))}
          </div>
        )}
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: "#0d9b6c" }}>{msg}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onClose} style={btnGhost}>Close</button>
          <button type="button" disabled={busy || mapped.length === 0} onClick={() => void doImport()} style={{ ...btn, opacity: busy || mapped.length === 0 ? 0.5 : 1 }}>{busy ? "Importing…" : `Import ${mapped.length}`}</button>
        </div>
      </div>
    </div>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const panel: CSSProperties = { background: "var(--ui-surface-strong)", color: "var(--ui-text)", borderRadius: 10, padding: 20, width: 520, maxWidth: "92vw", maxHeight: "85vh", overflow: "auto" };
const btn: CSSProperties = { background: "#0d9b6c", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer" };
const btnGhost: CSSProperties = { background: "var(--ui-surface-strong)", color: "#33475b", border: "1px solid var(--ui-border)", borderRadius: 8, padding: "8px 14px", cursor: "pointer" };
