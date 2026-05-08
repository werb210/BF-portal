// BF_PORTAL_BLOCK_v189_TAB_FIXES_ROUNDUP_v1 — Lenders tab: real table view.
// Reads /api/applications/:id/lenders/envelope, which returns one of:
//   { status: "locked", outstanding, matches: [], computed_at: null }
//   { status: "stale",  outstanding: [], matches: [...], computed_at }
//   { status: "ready",  outstanding: [], matches: [...], computed_at }
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

const styles = {
  page: { padding: 20, paddingBottom: 100 } as const,
  header: { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" } as const,
  subhead: { fontSize: 13, color: "#64748b", marginBottom: 16 } as const,
  banner: { padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 } as const,
  bannerStale: { background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" } as const,
  bannerError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" } as const,
  table: { width: "100%", borderCollapse: "collapse" as const, background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" } as const,
  th: { textAlign: "left" as const, padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#475569", background: "#f8fafc", borderBottom: "1px solid #e5e7eb" } as const,
  td: { padding: "12px 14px", fontSize: 13, color: "#0f172a", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" as const } as const,
  pill: { display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 } as const,
  btn: { border: "1px solid #cbd5e1", background: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#0f172a", fontFamily: "inherit" } as const,
  btnPrimary: { border: 0, background: "#2563eb", color: "#fff", padding: "10px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as const,
  btnPrimaryDisabled: { border: 0, background: "#cbd5e1", color: "#fff", padding: "10px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "not-allowed", fontFamily: "inherit" } as const,
  filesMenu: { position: "absolute" as const, top: "calc(100% + 4px)", left: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: 8, minWidth: 220, zIndex: 10 } as const,
  filesMenuItem: { display: "block", padding: "6px 8px", fontSize: 13, color: "#0f172a", textDecoration: "none", borderRadius: 4 } as const,
  empty: { padding: 32, textAlign: "center" as const, fontSize: 14, color: "#64748b", background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1" } as const,
  lockedCard: { padding: 20, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8 } as const,
  lockedTitle: { fontWeight: 700, color: "#0f172a", fontSize: 15, marginBottom: 6 } as const,
  lockedHint: { fontSize: 13, color: "#64748b", marginBottom: 12 } as const,
  lockedItem: { fontSize: 13, color: "#0f172a", padding: "6px 0", borderBottom: "1px dashed #e5e7eb" } as const,
  footer: { position: "sticky" as const, bottom: 0, marginTop: 16, padding: "12px 20px", background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8 } as const,
};

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

function getLikelihoodPercent(match: LenderMatch): number | null {
  const raw = (match as any).matchPercent ?? (match as any).matchPercentage ?? (match as any).matchScore ?? null;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace("%", ""));
  if (!Number.isFinite(n)) return null;
  return n > 1 ? Math.round(n) : Math.round(n * 100);
}

function formatLikelihood(match: LenderMatch): string {
  const pct = getLikelihoodPercent(match);
  return pct === null ? "—" : `${pct}%`;
}

function likelihoodColors(pct: number | null): { bg: string; fg: string } {
  if (pct === null) return { bg: "#f1f5f9", fg: "#475569" };
  if (pct >= 80) return { bg: "#dcfce7", fg: "#166534" };
  if (pct >= 60) return { bg: "#fef3c7", fg: "#92400e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
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
      if (root && ev.target instanceof Node && !root.contains(ev.target)) {
        setFilesOpenFor(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filesOpenFor]);

  const selectedIds = useMemo(
    () => selected.filter((s) => matches.some((m) => m.id === s)),
    [selected, matches],
  );

  const mutation = useMutation({
    mutationFn: (ids: string[]) => createLenderSubmission(id, ids),
    onSuccess: () => {
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] });
    },
  });

  const toggle = (matchId: string) => {
    setSelected((cur) => (cur.includes(matchId) ? cur.filter((x) => x !== matchId) : [...cur, matchId]));
  };

  const handleSend = async () => {
    if (sending || selectedIds.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      await mutation.mutateAsync(selectedIds);
    } catch (err) {
      setSendError(getErrorMessage(err, "Unable to send to lenders."));
    } finally {
      setSending(false);
    }
  };

  const handleRecalculate = async () => {
    if (recalculating) return;
    setRecalculating(true);
    setRecalcError(null);
    try {
      await recalculateLenderMatches(id);
      await queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] });
    } catch (err) {
      setRecalcError(getErrorMessage(err, "Recalculate failed."));
    } finally {
      setRecalculating(false);
    }
  };

  const handleUploadTermSheet = async (matchId: string, file: File) => {
    if (!file || !id) return;
    setUploadingFor(matchId);
    setUploadError(null);
    try {
      await uploadLenderTermSheet(id, matchId, file);
      await queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] });
    } catch (err) {
      setUploadError(getErrorMessage(err, "Term sheet upload failed."));
    } finally {
      setUploadingFor(null);
    }
  };

  if (!id) return <div style={styles.empty}>Select an application to view lenders.</div>;
  if (isLoading) return <div style={styles.empty}>Loading lenders…</div>;
  if (error) return <div style={styles.empty}>{getErrorMessage(error, "Unable to load lenders.")}</div>;
  if (!canManage) return <AccessRestricted message="You do not have permission to view lender submissions." />;

  if (envelope.status === "locked") {
    return (
      <div style={styles.page}>
        <h2 style={styles.header}>Lenders</h2>
        <div style={styles.subhead}>Lender matching is locked until all required documents are accepted.</div>
        <div style={styles.lockedCard} data-testid="lenders-locked">
          <div style={styles.lockedTitle}>Outstanding required documents</div>
          <div style={styles.lockedHint}>Upload and accept these to unlock lender matching.</div>
          {(envelope.outstanding ?? []).length === 0 ? (
            <div style={styles.lockedItem}>(no outstanding categories returned)</div>
          ) : (
            (envelope.outstanding ?? []).map((cat) => (
              <div key={cat} style={styles.lockedItem}>{String(cat).replace(/_/g, " ")}</div>
            ))
          )}
        </div>
      </div>
    );
  }

  const isStale = envelope.status === "stale";

  return (
    <div ref={filesRootRef} data-testid="lenders-tab" style={styles.page}>
      <h2 style={styles.header}>Lenders</h2>
      <div style={styles.subhead}>
        {matches.length} match{matches.length === 1 ? "" : "es"}
        {envelope.computed_at ? ` · last computed ${new Date(envelope.computed_at).toLocaleString()}` : ""}
      </div>

      {isStale && (
        <div style={{ ...styles.banner, ...styles.bannerStale }}>
          <span>Lender matches may be out of date. Inputs changed since the last calculation.</span>
          <button type="button" onClick={handleRecalculate} disabled={recalculating} style={styles.btn}>
            {recalculating ? "Recalculating…" : "Recalculate"}
          </button>
        </div>
      )}

      {recalcError && <div style={{ ...styles.banner, ...styles.bannerError }}>{recalcError}</div>}
      {sendError && <div style={{ ...styles.banner, ...styles.bannerError }}>{sendError}</div>}
      {uploadError && <div style={{ ...styles.banner, ...styles.bannerError }}>{uploadError}</div>}

      {matches.length === 0 ? (
        <div style={styles.empty}>No lender matches yet. Try Recalculate or check the application's amounts and category.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th} aria-label="Select" />
              <th style={styles.th}>Lender</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Funding Range</th>
              <th style={styles.th}>Likelihood</th>
              <th style={styles.th}>Files</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const checked = selected.includes(m.id);
              const files = (m as any).files as Array<{ id: string; filename: string; url?: string | null }> | undefined;
              const fileCount = files?.length ?? 0;
              const filesOpen = filesOpenFor === m.id;
              const isUploading = uploadingFor === m.id;
              const pct = getLikelihoodPercent(m);
              const pctColors = likelihoodColors(pct);

              return (
                <tr key={m.id}>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(m.id)}
                      disabled={sending || isStale}
                      aria-label={`Select ${m.lenderName ?? "lender"}`}
                    />
                  </td>
                  <td style={styles.td}><strong>{m.lenderName ?? "—"}</strong></td>
                  <td style={styles.td}>{m.productCategory ?? "—"}</td>
                  <td style={styles.td}>{formatRange(m)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.pill, background: pctColors.bg, color: pctColors.fg }}>
                      {formatLikelihood(m)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        data-testid={`lender-files-${m.id}`}
                        onClick={() => setFilesOpenFor(filesOpen ? null : m.id)}
                        disabled={isStale}
                        style={styles.btn}
                      >
                        {fileCount} file{fileCount === 1 ? "" : "s"} ▾
                      </button>
                      {filesOpen && (
                        <div role="menu" data-testid={`lender-files-menu-${m.id}`} style={styles.filesMenu}>
                          {fileCount === 0 ? (
                            <div style={{ ...styles.filesMenuItem, color: "#94a3b8" }}>No files yet.</div>
                          ) : (
                            (files ?? []).map((f) => (
                              <a key={f.id} href={f.url ?? "#"} target="_blank" rel="noopener noreferrer" style={styles.filesMenuItem}>
                                {f.filename}
                              </a>
                            ))
                          )}
                          <label style={{ ...styles.filesMenuItem, cursor: "pointer", color: "#2563eb", marginTop: 6, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                            {isUploading ? "Uploading…" : "⬆ Upload Term Sheet"}
                            <input
                              type="file"
                              data-testid={`upload-term-sheet-${m.id}`}
                              disabled={isUploading || isStale}
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void handleUploadTermSheet(m.id, f);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      onClick={() => {
                        const inp = document.querySelector(`[data-testid="upload-term-sheet-${m.id}"]`) as HTMLInputElement | null;
                        inp?.click();
                      }}
                      disabled={isUploading || isStale}
                      style={styles.btn}
                    >
                      {isUploading ? "Uploading…" : "Upload Term Sheet"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div data-testid="lenders-send-footer" style={styles.footer}>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || selectedIds.length === 0 || isStale}
          style={(sending || selectedIds.length === 0 || isStale) ? styles.btnPrimaryDisabled : styles.btnPrimary}
        >
          {sending ? "Sending…" : `Send to selected (${selectedIds.length})`}
        </button>
      </div>
    </div>
  );
}
