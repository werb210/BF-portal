// BF_PORTAL_BLOCK_1_28B_TAB_CONTENT_REBUILD
// BF_PORTAL_BLOCK_v183_FINANCIALS_TAB_FULL_BUILD_v1
//
// Reads /api/portal/applications/:id/financials (added in BF-Server v202).
// Server returns:
//   { documents: [...financial-category docs...],
//     fields:    [...OCR-extracted fields with display labels resolved...] }
//
// Rendered as a single cross-document pivot table:
// - columns = docs (oldest first)
// - rows    = distinct display labels across all docs (case-insensitive dedupe)
// - cell    = best value for that label in that doc (highest confidence, then first seen)

import { useEffect, useMemo, useState, type CSSProperties } from "react";
// BF_PORTAL_BLOCK_v189_TAB_FIXES_ROUNDUP_v1 — switched off the @/utils/api strict envelope wrapper
import { api } from "@/api";

interface Props { applicationId?: string }

type FinancialDoc = {
  documentId: string;
  category: string | null;
  filename: string | null;
  status: string | null;
  ocrStatus: string | null;
  uploadedAt: string | null;
};

type FinancialField = {
  documentId: string;
  sourceDocumentType: string | null;
  fieldKey: string;
  displayLabel: string;
  value: string;
  confidence: number;
};

type Response = {
  documents: FinancialDoc[];
  fields: FinancialField[];
};

export default function FinancialsTab({ applicationId }: Props) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) { setLoading(false); return; }
    setLoading(true);
    api.get<Response>(`/api/portal/applications/${applicationId}/financials`)
      .then((r) => { setData(r ?? { documents: [], fields: [] }); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load financials"))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const pivot = useMemo(() => {
    if (!data) return null;
    const sortedDocs = [...data.documents].sort((a, b) => {
      const aTs = a.uploadedAt ? new Date(a.uploadedAt).getTime() : Number.POSITIVE_INFINITY;
      const bTs = b.uploadedAt ? new Date(b.uploadedAt).getTime() : Number.POSITIVE_INFINITY;
      return aTs - bTs;
    });

    const rowsByKey = new Map<string, string>();
    const rowEntries: Array<{ key: string; label: string }> = [];
    const matrix = new Map<string, Map<string, FinancialField>>();
    for (const field of data.fields) {
      const normalized = field.displayLabel.trim().toLocaleLowerCase();
      if (!normalized) continue;
      if (!rowsByKey.has(normalized)) {
        rowsByKey.set(normalized, field.displayLabel.trim());
        rowEntries.push({ key: normalized, label: field.displayLabel.trim() });
      }
      if (!matrix.has(normalized)) matrix.set(normalized, new Map());
      const row = matrix.get(normalized)!;
      const existing = row.get(field.documentId);
      if (!existing) {
        row.set(field.documentId, field);
      } else {
        const existingConfidence = Number.isFinite(existing.confidence) ? existing.confidence : Number.NEGATIVE_INFINITY;
        const incomingConfidence = Number.isFinite(field.confidence) ? field.confidence : Number.NEGATIVE_INFINITY;
        if (incomingConfidence > existingConfidence) row.set(field.documentId, field);
      }
    }
    const sortedRows = rowEntries.sort((a, b) => a.label.localeCompare(b.label));
    return { sortedDocs, sortedRows, matrix };
  }, [data]);

  if (!applicationId) return <div style={styles.placeholder}>Select an application to view financials.</div>;
  if (loading)        return <div style={styles.placeholder}>Loading financials…</div>;
  if (error)          return <div style={styles.error}>{error}</div>;

  const totalDocs = data?.documents.length ?? 0;
  if (totalDocs === 0) {
    return (
      <div style={styles.page}>
        <header style={styles.headerRow}>
          <h2 style={styles.title}>Financials</h2>
        </header>
        <div style={styles.emptyAll}>
          No financial documents have been uploaded yet. Once the applicant uploads
          P&L, Balance Sheet, Cash Flow, or Tax Returns, OCR-extracted fields will
          appear here automatically.
        </div>
      </div>
    );
  }

  const sortedDocs = pivot?.sortedDocs ?? [];
  const sortedRows = pivot?.sortedRows ?? [];
  const matrix = pivot?.matrix ?? new Map<string, Map<string, FinancialField>>();
  const anyPending = sortedDocs.some((doc) => {
    const ocr = (doc.ocrStatus ?? "").toLowerCase();
    return ocr === "pending" || ocr === "processing" || ocr === "queued";
  });

  return (
    <div style={styles.page}>
      <header style={styles.headerRow}>
        <h2 style={styles.title}>Financials</h2>
        <div style={styles.subtitle}>
          {totalDocs} document{totalDocs === 1 ? "" : "s"} on file
        </div>
      </header>

      <section style={styles.section}>
        {sortedRows.length === 0 ? (
          <div style={styles.docNote}>
            {anyPending
              ? "OCR processing - extracted fields will appear here when ready."
              : "OCR completed but found no fields matching this category."}
          </div>
        ) : (
          <div style={{ ...pivotStyles.wrapper, overflowX: sortedDocs.length > 4 ? "auto" : "visible" }}>
            <table style={{ ...pivotStyles.table, minWidth: sortedDocs.length > 4 ? 720 : "100%" }}>
              <thead>
                <tr>
                  <th style={{ ...pivotStyles.thBase, ...pivotStyles.fieldHeader }}>Field</th>
                  {sortedDocs.map((doc) => {
                    const hasFields = data?.fields.some((f) => f.documentId === doc.documentId) ?? false;
                    return (
                      <th key={doc.documentId} style={{ ...pivotStyles.thBase, ...pivotStyles.docHeader }}>
                        <div style={pivotStyles.docHeaderName} title={doc.filename ?? "(untitled)"}>
                          {doc.filename ?? "(untitled)"}
                        </div>
                        <div style={pivotStyles.docHeaderPills}>
                          <DocStatusPill status={doc.status} />
                          <OcrStatusPill ocrStatus={doc.ocrStatus} hasFields={hasFields} />
                        </div>
                        <div style={pivotStyles.docHeaderDate}>uploaded {fmtDate(doc.uploadedAt)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.key}>
                    <th style={{ ...pivotStyles.tdBase, ...pivotStyles.fieldCell }}>{row.label}</th>
                    {sortedDocs.map((doc) => {
                      const field = matrix.get(row.key)?.get(doc.documentId);
                      return (
                        <td key={`${row.key}-${doc.documentId}`} style={pivotStyles.tdBase}>
                          {field ? (
                            <div style={pivotStyles.valueWrap}>
                              <span style={pivotStyles.valueText}>{field.value || "—"}</span>
                              <ConfidencePill confidence={field.confidence} />
                            </div>
                          ) : (
                            <span style={pivotStyles.emptyDash}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const pivotStyles: Record<string, CSSProperties> = {
  wrapper: { overflowX: "auto", border: "1px solid rgba(148, 163, 184, 0.3)", borderRadius: 10, background: "rgba(15, 23, 42, 0.02)" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 720 },
  thBase: { background: "rgba(15, 23, 42, 0.95)", color: "rgba(248, 250, 252, 0.96)", borderBottom: "1px solid rgba(148, 163, 184, 0.45)", padding: "10px 12px", fontSize: 12, textAlign: "left" as const, verticalAlign: "top" as const },
  tdBase: { background: "rgba(15, 23, 42, 0.03)", color: "#0f172a", borderBottom: "1px solid rgba(148, 163, 184, 0.2)", borderRight: "1px solid rgba(148, 163, 184, 0.2)", padding: "8px 12px", fontSize: 12, verticalAlign: "top" as const, minWidth: 200 },
  fieldHeader: { position: "sticky" as const, left: 0, zIndex: 5, minWidth: 220, borderRight: "1px solid rgba(148, 163, 184, 0.45)" },
  docHeader: { position: "sticky" as const, top: 0, zIndex: 4, minWidth: 220, borderRight: "1px solid rgba(148, 163, 184, 0.45)" },
  fieldCell: { position: "sticky" as const, left: 0, zIndex: 3, fontWeight: 600, color: "rgba(15, 23, 42, 0.92)", background: "rgba(248, 250, 252, 0.97)", borderRight: "1px solid rgba(148, 163, 184, 0.3)" },
  docHeaderName: { fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220, marginBottom: 6 },
  docHeaderPills: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const, marginBottom: 6 },
  docHeaderDate: { color: "rgba(226, 232, 240, 0.9)", fontSize: 11 },
  valueWrap: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  valueText: { color: "#0f172a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  emptyDash: { color: "rgba(71, 85, 105, 0.85)" },
};


function DocStatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const tone =
    s === "accepted" ? styles.pillGreen :
    s === "rejected" ? styles.pillRed :
                       styles.pillAmber;
  const label =
    s === "accepted" ? "Accepted" :
    s === "rejected" ? "Rejected" :
                       "Pending";
  return <span style={{ ...styles.pillBase, ...tone }}>{label}</span>;
}

function OcrStatusPill({ ocrStatus, hasFields }: { ocrStatus: string | null; hasFields: boolean }) {
  const s = (ocrStatus ?? "").toLowerCase();
  if (s === "completed" || hasFields) {
    return <span style={{ ...styles.ocrBase, ...styles.ocrGreen }}>OCR ✓</span>;
  }
  if (s === "failed") {
    return <span style={{ ...styles.ocrBase, ...styles.ocrRed }}>OCR failed</span>;
  }
  if (s === "processing") {
    return <span style={{ ...styles.ocrBase, ...styles.ocrBlue }}>OCR processing…</span>;
  }
  return <span style={{ ...styles.ocrBase, ...styles.ocrBlue }}>OCR queued</span>;
}

function ConfidencePill({ confidence }: { confidence: number }) {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return <span style={{ ...styles.confBase, ...styles.confLow }}>—</span>;
  }
  const pct = confidence > 1 ? Math.round(confidence) : Math.round(confidence * 100);
  const tone = pct >= 85 ? styles.confHigh : pct >= 60 ? styles.confMid : styles.confLow;
  return <span style={{ ...styles.confBase, ...tone }}>{pct}%</span>;
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

const styles: Record<string, CSSProperties> = {
  page: { padding: "16px 4px", maxWidth: 1200 },
  placeholder: { padding: 24, color: "#64748b" },
  error: { padding: 24, color: "#b91c1c" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: 700, margin: 0, color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", margin: 0 },
  emptyAll: { padding: 32, color: "#475569", lineHeight: 1.5, textAlign: "center", border: "1px dashed #e2e8f0", borderRadius: 8, background: "#f8fafc" },

  section: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", marginBottom: 12, boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" },
  sectionTitle: { fontSize: 13, fontWeight: 700, margin: "0 0 12px", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 },
  sectionCount: { color: "#94a3b8", fontSize: 12, fontWeight: 500 },
  docList: { display: "flex", flexDirection: "column", gap: 12 },

  docCard: { border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff" },
  docHeader: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" },
  filename: { fontWeight: 600, color: "#0f172a", fontSize: 13, flex: 1, minWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  docMetaRight: { fontSize: 11, color: "#94a3b8", marginLeft: "auto" },
  docNote: { padding: "8px 0", fontSize: 12, color: "#64748b", fontStyle: "italic" },

  fieldsTable: { display: "grid", gridTemplateColumns: "max-content 1fr auto", gap: "6px 16px", fontSize: 13 },
  fieldRow: { display: "contents" },
  fieldLabel: { color: "#475569", fontWeight: 600 },
  fieldValue: { color: "#0f172a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },

  pillBase: { padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  pillGreen: { background: "#dcfce7", color: "#166534" },
  pillAmber: { background: "#fef3c7", color: "#854d0e" },
  pillRed:   { background: "#fee2e2", color: "#991b1b" },

  ocrBase: { padding: "1px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  ocrGreen: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
  ocrRed:   { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" },
  ocrBlue:  { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },

  confBase: { padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, textAlign: "center" as const, minWidth: 36 },
  confHigh: { background: "#dcfce7", color: "#166534" },
  confMid:  { background: "#fef3c7", color: "#854d0e" },
  confLow:  { background: "#fee2e2", color: "#991b1b" },
};
