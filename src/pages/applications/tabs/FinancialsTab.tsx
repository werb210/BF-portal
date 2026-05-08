// BF_PORTAL_BLOCK_1_28B_TAB_CONTENT_REBUILD
// BF_PORTAL_BLOCK_v183_FINANCIALS_TAB_FULL_BUILD_v1
//
// Reads /api/portal/applications/:id/financials (added in BF-Server v202).
// Server returns:
//   { documents: [...financial-category docs...],
//     fields:    [...OCR-extracted fields with display labels resolved...] }
//
// We group by source category (income_statement / balance_sheet / cash_flow /
// taxes) and render each as a section with the source documents and a
// key/value table of extracted fields.
//
// Different empty states matter for underwriting trust:
//   "no docs"      = applicant hasn't uploaded yet — don't read further
//   "ocr pending"  = docs are there but extraction hasn't finished — wait
//   "no fields"    = extraction ran but found nothing of value — manual review

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/utils/api";

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

const SECTIONS: Array<{ id: string; label: string; matches: (cat: string) => boolean }> = [
  { id: "income_statement", label: "Income Statement (P&L)", matches: (c) => /income|profit|loss|^p_?l$/i.test(c) },
  { id: "balance_sheet",    label: "Balance Sheet",          matches: (c) => /balance|financial_statement/i.test(c) },
  { id: "cash_flow",        label: "Cash Flow",              matches: (c) => /cash_?flow/i.test(c) },
  { id: "taxes",            label: "Tax Returns",            matches: (c) => /^tax/i.test(c) },
];

const SECTION_BY_OCR_TYPE: Record<string, string> = {
  income_statement: "income_statement",
  balance_sheet:    "balance_sheet",
  cash_flow:        "cash_flow",
  taxes:            "taxes",
};

export default function FinancialsTab({ applicationId }: Props) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) { setLoading(false); return; }
    setLoading(true);
    api<Response>(`/api/portal/applications/${applicationId}/financials`)
      .then((r) => { setData(r ?? { documents: [], fields: [] }); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load financials"))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const sectioned = useMemo(() => {
    if (!data) return [];
    return SECTIONS.map((sec) => {
      const docs = data.documents.filter((d) => d.category && sec.matches(d.category));
      const docIds = new Set(docs.map((d) => d.documentId));
      const fields = data.fields.filter((f) => {
        if (docIds.has(f.documentId)) return true;
        const mapped = f.sourceDocumentType ? SECTION_BY_OCR_TYPE[f.sourceDocumentType] : null;
        return mapped === sec.id;
      });
      // Group fields by document for display
      const fieldsByDoc = new Map<string, FinancialField[]>();
      for (const f of fields) {
        if (!fieldsByDoc.has(f.documentId)) fieldsByDoc.set(f.documentId, []);
        fieldsByDoc.get(f.documentId)!.push(f);
      }
      return { ...sec, docs, fieldsByDoc };
    });
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

  const sectionsWithDocs = sectioned.filter((s) => s.docs.length > 0);
  const orphanFields = data
    ? data.fields.filter((f) => {
        // Fields whose source category doesn't match any section we render
        const mapped = f.sourceDocumentType ? SECTION_BY_OCR_TYPE[f.sourceDocumentType] : null;
        return !mapped && !sectionsWithDocs.some((s) => s.fieldsByDoc.has(f.documentId));
      })
    : [];

  return (
    <div style={styles.page}>
      <header style={styles.headerRow}>
        <h2 style={styles.title}>Financials</h2>
        <div style={styles.subtitle}>
          {totalDocs} document{totalDocs === 1 ? "" : "s"} on file
        </div>
      </header>

      {sectionsWithDocs.map((sec) => (
        <Section key={sec.id} label={sec.label} docs={sec.docs} fieldsByDoc={sec.fieldsByDoc} />
      ))}

      {sectionsWithDocs.length === 0 && (
        <div style={styles.emptyAll}>
          Documents are uploaded but none match standard financial categories
          (P&L, Balance Sheet, Cash Flow, Tax Returns). Check the Documents tab.
        </div>
      )}

      {orphanFields.length > 0 && (
        <details style={styles.section}>
          <summary style={styles.sectionTitle}>
            Other extracted fields <span style={styles.sectionCount}>({orphanFields.length})</span>
          </summary>
          <p style={styles.subtitle}>
            Fields extracted from documents that didn't match a standard financial section.
          </p>
          <FieldsTable fields={orphanFields} />
        </details>
      )}
    </div>
  );
}

function Section({
  label, docs, fieldsByDoc,
}: {
  label: string;
  docs: FinancialDoc[];
  fieldsByDoc: Map<string, FinancialField[]>;
}) {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>
        {label}
        <span style={styles.sectionCount}>({docs.length} doc{docs.length === 1 ? "" : "s"})</span>
      </h3>
      <div style={styles.docList}>
        {docs.map((doc) => {
          const docFields = fieldsByDoc.get(doc.documentId) ?? [];
          const ocrLower = (doc.ocrStatus ?? "").toLowerCase();
          const ocrPending = ocrLower === "pending" || ocrLower === "processing" || ocrLower === "queued" || (!ocrLower && docFields.length === 0);
          const ocrFailed  = ocrLower === "failed";
          return (
            <div key={doc.documentId} style={styles.docCard}>
              <div style={styles.docHeader}>
                <span style={styles.filename}>{doc.filename ?? "(untitled)"}</span>
                <DocStatusPill status={doc.status} />
                <OcrStatusPill ocrStatus={doc.ocrStatus} hasFields={docFields.length > 0} />
                <span style={styles.docMetaRight}>uploaded {fmtDate(doc.uploadedAt)}</span>
              </div>
              {docFields.length > 0 ? (
                <FieldsTable fields={docFields} />
              ) : ocrPending ? (
                <div style={styles.docNote}>OCR processing — extracted fields will appear here when ready.</div>
              ) : ocrFailed ? (
                <div style={{ ...styles.docNote, color: "#b91c1c" }}>OCR failed — manual review required.</div>
              ) : (
                <div style={styles.docNote}>OCR completed but found no fields matching this category.</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FieldsTable({ fields }: { fields: FinancialField[] }) {
  // Stable sort: required-feeling fields first (revenue, net income, total assets etc.), then alpha.
  const sorted = [...fields].sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));
  return (
    <div style={styles.fieldsTable}>
      {sorted.map((f, i) => (
        <div key={`${f.documentId}-${f.fieldKey}-${i}`} style={styles.fieldRow}>
          <div style={styles.fieldLabel}>{f.displayLabel}</div>
          <div style={styles.fieldValue}>{f.value || "—"}</div>
          <ConfidencePill confidence={f.confidence} />
        </div>
      ))}
    </div>
  );
}

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
