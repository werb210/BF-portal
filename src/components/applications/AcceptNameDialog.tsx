// BF_PORTAL_ACCEPT_NAME_v266
// Accept with a clean name. Staff type only the period ("July"); the business
// name and document type come from BF-Server (v264/v265) and the full name is
// previewed live. Enter accepts. On an older server without the naming route,
// the dialog still accepts, just without renaming.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { api } from "@/api";

export type NameParts = { businessName: string | null; documentType: string; period: string | null; extension: string };

export function buildDocumentName(parts: NameParts, period: string): string {
  const pieces = [parts.businessName, parts.documentType, period.trim() || null].filter(Boolean);
  return `${pieces.join(" - ")}${parts.extension || ".pdf"}`;
}

export default function AcceptNameDialog(props: {
  documentId: string;
  originalFilename: string | null;
  working: boolean;
  onCancel: () => void;
  onConfirm: (displayName: string | null) => void;
  // BF_PORTAL_ACCEPT_CATEGORY_v318 - fix the category while naming, without leaving the dialog.
  category?: string | null;
  categories?: string[];
  onMoved?: (category: string) => void;
}) {
  const [category, setCategory] = useState<string>(props.category ?? "");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [nameVersion, setNameVersion] = useState(0);
  const categoryOptions = categoryChoices(props.categories ?? [], props.category ?? null);
  async function changeCategory(next: string) {
    if (!next || next === category) return;
    setMoving(true);
    setMoveError(null);
    try {
      await api.post(`/api/documents/${encodeURIComponent(props.documentId)}/category`, { category: next });
      setCategory(next);
      props.onMoved?.(next);
      setNameVersion((v) => v + 1); // the suggested name follows the new category
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : "Could not change the category.");
    } finally {
      setMoving(false);
    }
  }
  const [parts, setParts] = useState<NameParts | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [period, setPeriod] = useState("");
  const [editingFull, setEditingFull] = useState(false);
  const [fullName, setFullName] = useState("");
  const periodRef = useRef<HTMLInputElement | null>(null);
  const fullNameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get<{ parts?: NameParts; currentName?: string | null }>(`/api/portal/documents/${props.documentId}/suggested-name`);
        const got = r?.parts ?? (r as any)?.data?.parts ?? null;
        if (cancelled) return;
        if (got?.documentType) {
          setParts(got);
          setPeriod(got.period ?? "");
          const current = r?.currentName ?? (r as any)?.data?.currentName ?? null;
          if (current) { setEditingFull(true); setFullName(current); }
        }
      } catch {
        // older server: accept without renaming
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [props.documentId, nameVersion]);

  useEffect(() => {
    if (!loaded) return;
    (editingFull ? fullNameRef : periodRef).current?.focus();
  }, [editingFull, loaded]);

  const preview = parts ? buildDocumentName(parts, period) : null;
  const finalName = parts ? (editingFull ? fullName.trim() : preview) : null;
  const confirm = () => { if (!props.working) props.onConfirm(finalName && finalName.length > 0 ? finalName : null); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") { event.preventDefault(); confirm(); }
    if (event.key === "Escape") props.onCancel();
  };

  return (
    <div role="presentation" style={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) props.onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="accept-name-title" style={styles.dialog} data-testid="accept-name-dialog">
        <h2 id="accept-name-title" style={styles.title}>Accept document</h2>
        {!loaded ? <p style={styles.help}>Preparing document name…</p> : parts ? (
          <>
            {editingFull ? (
              <>
                <label htmlFor="accepted-document-name" style={styles.label}>Document name</label>
                <input ref={fullNameRef} id="accepted-document-name" value={fullName} onChange={(event) => setFullName(event.target.value)} onKeyDown={onKeyDown} style={styles.input} disabled={props.working} />
                <button type="button" style={styles.linkButton} onClick={() => setEditingFull(false)}>Use suggested name</button>
              </>
            ) : (
              <>
                <label htmlFor="accepted-document-period" style={styles.label}>Period</label>
                <input ref={periodRef} id="accepted-document-period" value={period} onChange={(event) => setPeriod(event.target.value)} onKeyDown={onKeyDown} style={styles.input} placeholder="e.g. July or 2025" disabled={props.working} />
                <div style={styles.previewLabel}>Document will be named</div>
                <div style={styles.preview} data-testid="accept-name-preview">{preview}</div>
                <button type="button" style={styles.linkButton} onClick={() => { setFullName(preview ?? ""); setEditingFull(true); }}>Edit full name</button>
              </>
            )}
          </>
        ) : (
          <p style={styles.help}>Accept <strong>{props.originalFilename || "this document"}</strong>? Naming is unavailable, so its current name will be kept.</p>
        )}
        {moveError && <p role="alert" style={{ margin: "12px 0 0", color: "#b91c1c", fontSize: 13 }}>{moveError}</p>}
        <div style={{ ...styles.actions, justifyContent: categoryOptions.length ? "space-between" : "flex-end" }}>
          {categoryOptions.length ? (
            <select
              aria-label="Document category"
              data-testid="accept-category"
              value={category}
              disabled={props.working || moving}
              onChange={(event) => void changeCategory(event.target.value)}
              style={styles.category}
            >
              {!category && <option value="">Choose category…</option>}
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={props.onCancel} disabled={props.working} style={styles.cancel}>Cancel</button>
            <button type="button" onClick={confirm} disabled={!loaded || props.working || moving} style={styles.accept}>{props.working ? "Accepting…" : moving ? "Moving…" : "Accept"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: { position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(15, 23, 42, 0.5)" },
  dialog: { width: 480, maxWidth: "100%", borderRadius: 12, padding: 24, background: "var(--ui-surface-strong)", color: "var(--ui-text)", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" },
  title: { margin: "0 0 20px", fontSize: 20 },
  label: { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700 },
  input: { width: "100%", boxSizing: "border-box", fontSize: 16, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" },
  help: { margin: "0 0 20px", color: "var(--ui-text-muted)", lineHeight: 1.5 },
  previewLabel: { marginTop: 18, fontSize: 12, fontWeight: 700, color: "var(--ui-text-muted)", textTransform: "uppercase" },
  preview: { marginTop: 5, padding: "10px 12px", borderRadius: 8, background: "var(--ui-surface-muted)", overflowWrap: "anywhere", fontWeight: 600 },
  linkButton: { marginTop: 9, padding: 0, border: 0, background: "transparent", color: "var(--ui-accent-blue)", cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 600 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 },
  cancel: { padding: "9px 15px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", cursor: "pointer", fontWeight: 600 },
  accept: { padding: "9px 15px", borderRadius: 8, border: 0, background: "#16a34a", color: "#fff", cursor: "pointer", fontWeight: 700 },
  category: { flex: "1 1 auto", minWidth: 0, maxWidth: 240, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13 },
};

/** The staff categories, with the document's current category first if it is not one of them. */
export function categoryChoices(categories: string[], current: string | null): string[] {
  const list = [...categories];
  if (current && !list.some((c) => c.toLowerCase() === current.toLowerCase())) list.unshift(current);
  return list;
}
