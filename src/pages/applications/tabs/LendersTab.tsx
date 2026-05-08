// BF_LENDERS_TAB_REAL_v42 — Block 42-B
// BF_LENDERS_TAB_FIX_v55_PORTAL — funding-range column
// BF_PORTAL_BLOCK_v179_LENDERS_TAB_GATING_ROUTED_v1 — envelope-based gating.
// BF_PORTAL_BLOCK_v186_LENDERS_TAB_POLISH_v1 — drawer-parity polish.
// BF_PORTAL_BLOCK_v186b_LENDERS_TAB_RESTORE_v1 — restore full visible content
//   that was stripped during v186 apply (locked outstanding list, stale banner,
//   per-row lender name/category/range/likelihood, empty placeholder).
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLenderSubmission,
  fetchLenderEnvelope,
  recalculateLenderMatches,
  uploadLenderTermSheet,
  type LenderEnvelope,
  type LenderMatch,
} from "@/api/lenders";
import { getErrorMessage } from "@/utils/errors";
import { useAuth } from "@/hooks/useAuth";
import AccessRestricted from "@/components/auth/AccessRestricted";
import { canWrite } from "@/auth/can";

type Props = { applicationId?: string | null };

function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}
function formatRange(match: LenderMatch): string {
  const lo = (match as any).amountMin ?? null;
  const hi = (match as any).amountMax ?? null;
  if (lo === null && hi === null) return "—";
  return `${formatAmount(lo)} – ${formatAmount(hi)}`;
}
function formatLikelihood(match: LenderMatch): string {
  const raw = (match as any).matchPercent ?? (match as any).matchPercentage ?? (match as any).matchScore ?? null;
  if (raw === null || raw === undefined || raw === "") return "—";
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(n)) {
    const rounded = n > 1 ? Math.round(n) : Math.round(n * 100);
    return `${rounded}%`;
  }
  const trimmed = String(raw).trim();
  return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
}

export default function LendersTab({ applicationId }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = canWrite((user as { role?: string | null } | null)?.role ?? null);
  const id = applicationId ?? "";

  const { data, isLoading, error } = useQuery<LenderEnvelope>({
    queryKey: ["lenders", id, "envelope"],
    queryFn: ({ signal }) => fetchLenderEnvelope(id, { signal }),
    enabled: Boolean(id),
  });

  const envelope: LenderEnvelope = data ?? { status: "locked", outstanding: [], computed_at: null, matches: [] };
  const matches = envelope.matches ?? [];

  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const [filesOpenFor, setFilesOpenFor] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const filesRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filesOpenFor) return;
    const onDocClick = (ev: MouseEvent) => {
      const root = filesRootRef.current;
      if (root && ev.target instanceof Node && !root.contains(ev.target)) setFilesOpenFor(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filesOpenFor]);

  const selectedIds = useMemo(() => selected.filter((s) => matches.some((m) => m.id === s)), [selected, matches]);

  const mutation = useMutation({
    mutationFn: (ids: string[]) => createLenderSubmission(id, ids),
    onSuccess: () => { setSelected([]); queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] }); },
  });

  const toggle = (matchId: string) =>
    setSelected((cur) => cur.includes(matchId) ? cur.filter((x) => x !== matchId) : [...cur, matchId]);

  const handleSend = async () => {
    if (sending || selectedIds.length === 0) return;
    setSending(true); setSendError(null);
    try { await mutation.mutateAsync(selectedIds); }
    catch (err) { setSendError(getErrorMessage(err, "Unable to send to lenders.")); }
    finally { setSending(false); }
  };

  const handleRecalculate = async () => {
    if (recalculating) return;
    setRecalculating(true); setRecalcError(null);
    try { await recalculateLenderMatches(id); await queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] }); }
    catch (err) { setRecalcError(getErrorMessage(err, "Recalculate failed.")); }
    finally { setRecalculating(false); }
  };

  const handleUploadTermSheet = async (matchId: string, file: File) => {
    if (!file || !id) return;
    setUploadingFor(matchId); setUploadError(null);
    try { await uploadLenderTermSheet(id, matchId, file); await queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] }); }
    catch (err) { setUploadError(getErrorMessage(err, "Term sheet upload failed.")); }
    finally { setUploadingFor(null); }
  };

  if (!id)        return <div className="drawer-placeholder">Select an application to view lenders.</div>;
  if (isLoading)  return <div className="drawer-placeholder">Loading lenders…</div>;
  if (error)      return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load lenders.")}</div>;
  if (!canManage) return <AccessRestricted message="You do not have permission to view lender submissions." />;

  if (envelope.status === "locked") {
    return (
      <div data-testid="lenders-locked" style={{ padding: "16px 4px" }}>
        <div style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 12, padding: "20px 24px", maxWidth: 640 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Lender matching is locked</div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>
            Lender matches are computed once all required documents are accepted.
          </div>
          {envelope.outstanding.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 8 }}>
                Outstanding ({envelope.outstanding.length})
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#0f172a" }}>
                {envelope.outstanding.map((c) => <li key={c} style={{ marginBottom: 4 }}>{c}</li>)}
              </ul>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>Awaiting required-document list.</div>
          )}
        </div>
      </div>
    );
  }

  const isStale = envelope.status === "stale";

  return (
    <div ref={filesRootRef} data-testid="lenders-tab" style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 80 }}>
      {isStale && (
        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", color: "#78350f", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          <span style={{ fontWeight: 700 }}>⚠ Matches are stale</span>
          <span style={{ flex: 1 }}>
            A document was rejected after the last computation. Recalculate to refresh.
            {envelope.computed_at && (
              <span style={{ opacity: 0.7, marginLeft: 8 }}>
                Last computed: {new Date(envelope.computed_at).toLocaleString()}
              </span>
            )}
          </span>
          <button type="button" onClick={handleRecalculate} disabled={recalculating}
            style={{ background: recalculating ? "#fbbf24" : "#f59e0b", color: "#fff", border: 0, borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: recalculating ? "default" : "pointer" }}>
            {recalculating ? "Recalculating…" : "Recalculate"}
          </button>
        </div>
      )}
      {recalcError && <div role="alert" style={{ color: "#b91c1c", padding: 8, background: "#fef2f2", borderRadius: 6 }}>{recalcError}</div>}
      {sendError && <div role="alert" style={{ color: "#b91c1c", padding: 8, background: "#fef2f2", borderRadius: 6 }}>{sendError}</div>}
      {uploadError && <div role="alert" style={{ color: "#b91c1c", padding: 8, background: "#fef2f2", borderRadius: 6 }}>{uploadError}</div>}

      {matches.length === 0 ? (
        <div className="drawer-placeholder">
          {isStale ? "No cached matches available — click Recalculate to compute." : "No lender products match this application yet."}
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8, opacity: isStale ? 0.7 : 1 }} aria-label="Lender list">
          {matches.map((m) => {
            const checked = selected.includes(m.id);
            const files = (m as any).files as Array<{ id: string; filename: string; url?: string | null }> | undefined;
            const fileCount = files?.length ?? 0;
            const filesOpen = filesOpenFor === m.id;
            const isUploading = uploadingFor === m.id;
            return (
              <li key={m.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto auto auto", gap: 16, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <strong>{(m as any).lenderName ?? "Unknown lender"}</strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{(m as any).productName ?? ""}</span>
                </div>
                <div style={{ fontSize: 13, color: "#334155" }}>{(m as any).productCategory ?? "—"}</div>
                <div style={{ fontSize: 13, color: "#334155" }}>{formatRange(m)}</div>
                <div style={{ fontWeight: 600 }}>{formatLikelihood(m)}</div>
                <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(m.id)} disabled={sending || isStale} aria-label={`Send to ${(m as any).lenderName ?? "lender"}`} />
                  Send
                </label>
                <div style={{ position: "relative" }}>
                  <button type="button" data-testid={`lender-files-${m.id}`} onClick={() => setFilesOpenFor(filesOpen ? null : m.id)} disabled={isStale}
                    style={{ padding: "6px 12px", border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, fontSize: 12, cursor: isStale ? "not-allowed" : "pointer", opacity: isStale ? 0.6 : 1 }}>
                    {fileCount} file{fileCount === 1 ? "" : "s"} ▾
                  </button>
                  {filesOpen ? (
                    <div role="menu" data-testid={`lender-files-menu-${m.id}`}
                      style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 10, minWidth: 240, padding: 8 }}>
                      {fileCount === 0 ? (
                        <div style={{ color: "#9ca3af", fontSize: 12, padding: "4px 6px" }}>No files yet.</div>
                      ) : (
                        (files ?? []).map((f) => (
                          <a key={f.id} href={f.url ?? "#"} target="_blank" rel="noopener noreferrer"
                            style={{ display: "block", padding: "4px 6px", color: "#111", textDecoration: "none", fontSize: 12 }}>
                            {f.filename}
                          </a>
                        ))
                      )}
                      <label style={{ display: "block", padding: "6px", borderTop: "1px solid #f3f4f6", marginTop: 6, color: isUploading ? "#9ca3af" : "#2563eb", cursor: isUploading ? "default" : "pointer", fontSize: 12 }}>
                        {isUploading ? "Uploading…" : "⬆ Upload Term Sheet"}
                        <input type="file" data-testid={`upload-term-sheet-${m.id}`} disabled={isUploading || isStale} style={{ display: "none" }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadTermSheet(m.id, f); e.currentTarget.value = ""; }} />
                      </label>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div data-testid="lenders-send-footer"
        style={{ position: "sticky", bottom: 0, marginLeft: -16, marginRight: -16, padding: "12px 16px", background: "rgba(255,255,255,0.96)", backdropFilter: "blur(4px)", borderTop: "1px solid #e5e7eb", boxShadow: "0 -2px 8px rgba(15,23,42,0.04)", display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", zIndex: 5 }}>
        {selectedIds.length > 0 && !isStale ? (<span style={{ fontSize: 12, color: "#475569" }}>{selectedIds.length} lender{selectedIds.length === 1 ? "" : "s"} selected</span>) : null}
        <button type="button" onClick={handleSend} disabled={sending || selectedIds.length === 0 || isStale} title={isStale ? "Recalculate before sending — matches are stale." : undefined}
          style={{ padding: "8px 18px", background: selectedIds.length === 0 || isStale ? "#9ca3af" : "#2563eb", color: "#fff", border: 0, borderRadius: 6, cursor: selectedIds.length === 0 || isStale ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {sending ? "Sending…" : `Send (${selectedIds.length})`}
        </button>
      </div>
    </div>
  );
}
