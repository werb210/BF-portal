// BF_PORTAL_BLOCK_v189_TAB_FIXES_ROUNDUP_v1 — Lenders tab: real table view.
// BF_PORTAL_BLOCK_v189a_LENDERS_TAB_TEST_CONFORMANCE_v1 — align Send button label,
// stale-banner copy, checkbox aria-label, and productName subtitle to the v186
// test contract that LendersTab.test.tsx + LendersTab.columns.test.tsx assert.
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
import { api } from "@/api"; // BF_PORTAL_BLOCK_v_SIGNING_RESEND_v1 — collateral-required signal
import { getErrorMessage } from "@/utils/errors";
import { useAuth } from "@/hooks/useAuth";
import AccessRestricted from "@/components/auth/AccessRestricted";
import { canWrite } from "@/auth/can";
// BF_PORTAL_BLOCK_v303_COLLATERAL_DOCTYPES_v1
import CollateralFacilitySection from "@/pages/applications/tabs/CollateralFacilitySection";

type Props = { applicationId?: string | null };

const styles = {
  page: { padding: 20, paddingBottom: 100 } as const,
  header: { fontSize: 22, fontWeight: 700, color: "var(--ui-text)", margin: "0 0 4px" } as const,
  subhead: { fontSize: 13, color: "var(--ui-text-muted)", marginBottom: 16 } as const,
  banner: { padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 } as const,
  bannerStale: { background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" } as const,
  bannerError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" } as const,
  table: { width: "100%", borderCollapse: "collapse" as const, background: "var(--ui-surface-strong)", borderRadius: 8, overflow: "hidden", border: "1px solid var(--ui-border)" } as const,
  th: { textAlign: "left" as const, padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted)", background: "var(--ui-surface-muted)", borderBottom: "1px solid var(--ui-border)" } as const,
  td: { padding: "12px 14px", fontSize: 13, color: "var(--ui-text)", borderBottom: "1px solid var(--ui-border-soft)", verticalAlign: "middle" as const } as const,
  pill: { display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 } as const,
  btn: { border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "var(--ui-text)", fontFamily: "inherit" } as const,
  btnPrimary: { border: 0, background: "var(--ui-accent-blue)", color: "#fff", padding: "10px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as const,
  btnPrimaryDisabled: { border: 0, background: "var(--ui-surface-muted)", color: "#fff", padding: "10px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "not-allowed", fontFamily: "inherit" } as const,
  filesMenu: { position: "absolute" as const, top: "calc(100% + 4px)", left: 0, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: 8, minWidth: 220, zIndex: 10 } as const,
  filesMenuItem: { display: "block", padding: "6px 8px", fontSize: 13, color: "var(--ui-text)", textDecoration: "none", borderRadius: 4 } as const,
  empty: { padding: 32, textAlign: "center" as const, fontSize: 14, color: "var(--ui-text-muted)", background: "var(--ui-surface-muted)", borderRadius: 8, border: "1px dashed var(--ui-border)" } as const,
  lockedCard: { padding: 20, background: "var(--ui-surface-muted)", border: "1px solid var(--ui-border)", borderRadius: 8 } as const,
  lockedTitle: { fontWeight: 700, color: "var(--ui-text)", fontSize: 15, marginBottom: 6 } as const,
  lockedHint: { fontSize: 13, color: "var(--ui-text-muted)", marginBottom: 12 } as const,
  lockedItem: { fontSize: 13, color: "var(--ui-text)", padding: "6px 0", borderBottom: "1px dashed var(--ui-border-soft)" } as const,
  footer: { position: "sticky" as const, bottom: 0, marginTop: 16, padding: "12px 20px", background: "var(--ui-surface-strong)", borderTop: "1px solid var(--ui-border)", display: "flex", justifyContent: "flex-end", gap: 8 } as const,
  modalOverlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 } as const,
  modalCard: { background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 10, padding: 20, width: 420, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" as const, boxShadow: "0 12px 40px rgba(0,0,0,0.2)" } as const,
  modalTitle: { fontSize: 16, fontWeight: 700, color: "var(--ui-text)", marginBottom: 4 } as const,
  modalHint: { fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 14 } as const,
  modalLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted)", marginBottom: 10 } as const,
  modalInput: { display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const } as const,
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 } as const,
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
  if (pct === null) return { bg: "var(--ui-surface-muted)", fg: "var(--ui-text-muted)" };
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
  // BF_PORTAL_BLOCK_v_SIGNING_RESEND_v1 — collateral is REQUIRED once an Accord LOC is finalized;
  // keep the Collateral & Facility card reachable even when no match row is currently checked.
  const { data: v_signing } = useQuery({
    queryKey: ["signing-readiness", id],
    queryFn: async () => {
      const r = await api.get<{ data?: { snapshot?: { collateralRequired?: boolean }; collateralApplies?: boolean } } & { snapshot?: { collateralRequired?: boolean }; collateralApplies?: boolean }>(
        `/api/applications/${encodeURIComponent(id)}/signing-readiness`,
      );
      return ((r as any)?.data ?? r) as { snapshot?: { collateralRequired?: boolean }; collateralApplies?: boolean };
    },
    enabled: Boolean(id),
  });
  const v_collateralRequired = Boolean(v_signing?.snapshot?.collateralRequired);
  // BF_PORTAL_BLOCK_v_COLLATERAL_THRESHOLD_v1 — Accord LOC collateral applies only above $250k.
  const v_collateralApplies = Boolean(v_signing?.collateralApplies);
  // BF_PORTAL_BLOCK_v_SENT_LENDERS_v1 — lenders that already received the package (sent_at), for the row marker.
  const { data: v_sentData } = useQuery({
    queryKey: ["sent-lenders", id],
    queryFn: async () => {
      const r = await api.get<{ data?: { sent?: Array<{ lenderId?: string; sentAt?: string | null }> } } & { sent?: Array<{ lenderId?: string; sentAt?: string | null }> }>(
        `/api/applications/${encodeURIComponent(id)}/sent-lenders`,
      );
      return ((r as any)?.data ?? r) as { sent?: Array<{ lenderId?: string; sentAt?: string | null }> };
    },
    enabled: Boolean(id),
  });
  const v_sentMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const x of v_sentData?.sent ?? []) {
      if (x?.lenderId) map.set(String(x.lenderId), x.sentAt ?? null);
    }
    return map;
  }, [v_sentData]);

  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const [filesOpenFor, setFilesOpenFor] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [termSheetFor, setTermSheetFor] = useState<{ matchId: string; lenderName: string } | null>(null);
  const [tsFile, setTsFile] = useState<File | null>(null);
  const [tsAmount, setTsAmount] = useState("");
  const [tsRate, setTsRate] = useState("");
  const [tsTerm, setTsTerm] = useState("");
  const [tsPayment, setTsPayment] = useState("");
  const [tsExpiry, setTsExpiry] = useState("");
  const [tsNotes, setTsNotes] = useState("");
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

  const resetTermSheet = () => {
    setTermSheetFor(null);
    setTsFile(null);
    setTsAmount("");
    setTsRate("");
    setTsTerm("");
    setTsPayment("");
    setTsExpiry("");
    setTsNotes("");
  };

  const handleSubmitTermSheet = async () => {
    if (!termSheetFor || !tsFile || !id) return;
    setUploadingFor(termSheetFor.matchId);
    setUploadError(null);
    try {
      await uploadLenderTermSheet(id, termSheetFor.matchId, tsFile, {
        amount: tsAmount,
        rate_factor: tsRate,
        term: tsTerm,
        payment_frequency: tsPayment,
        expiry_date: tsExpiry,
        notes: tsNotes,
      });
      await queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] });
      resetTermSheet();
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
          <span>Matches are stale. Inputs changed since the last calculation.</span>
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
                      aria-label={`Send to ${m.lenderName ?? "lender"}`}
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 700 }}>{m.lenderName ?? "—"}</div>
                    {m.lenderId && v_sentMap.has(String(m.lenderId)) && (
                      <div style={{ marginTop: 2, fontSize: 11, fontWeight: 700, color: "#16a34a" }}>
                        {"\u2713 Sent"}{v_sentMap.get(String(m.lenderId)) ? ` \u00b7 ${new Date(String(v_sentMap.get(String(m.lenderId)))).toLocaleDateString()}` : ""}
                      </div>
                    )}
                    {m.productName ? <div style={{ fontSize: 11, color: "var(--ui-text-muted)", marginTop: 2 }}>{m.productName}</div> : null}
                  </td>
                  <td style={styles.td}>{m.productCategory ?? "—"}</td>
                  <td style={styles.td}>{formatRange(m)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.pill, background: pctColors?.bg ?? "transparent", color: pctColors?.fg ?? "inherit" }}>
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
                            <div style={{ ...styles.filesMenuItem, color: "var(--ui-text-muted)" }}>No files yet.</div>
                          ) : (
                            (files ?? []).map((f) => (
                              <a key={f.id} href={f.url ?? "#"} target="_blank" rel="noopener noreferrer" style={styles.filesMenuItem}>
                                {f.filename}
                              </a>
                            ))
                          )}
                          <label style={{ ...styles.filesMenuItem, cursor: "pointer", color: "var(--ui-accent-fg)", marginTop: 6, borderTop: "1px solid var(--ui-border-soft)", paddingTop: 8 }}>
                            {isUploading ? "Uploading…" : "⬆ Upload Term Sheet"}
                            <input
                              type="file"
                              data-testid={`upload-term-sheet-${m.id}`}
                              disabled={isUploading || isStale}
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setTsFile(f);
                                  setTermSheetFor({ matchId: m.id, lenderName: m.lenderName ?? "lender" });
                                  setFilesOpenFor(null);
                                }
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

      {/* BF_PORTAL_BLOCK_v741_COLLATERAL_GATE — show only once Accord is checked, under the lenders. */}
      {/* BF_PORTAL_COLLATERAL_LOC_ONLY_v1 — Accord Collateral & Facility is an LOC requirement only. */}
      {(v_collateralRequired || (v_collateralApplies && matches.some((m) => selected.includes(m.id) && /accord/i.test(m.lenderName ?? "") && String(m.productCategory ?? "").toUpperCase() === "LOC"))) && (
        <CollateralFacilitySection applicationId={id} />
      )}

      <div data-testid="lenders-send-footer" style={styles.footer}>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || selectedIds.length === 0 || isStale}
          style={(sending || selectedIds.length === 0 || isStale) ? styles.btnPrimaryDisabled : styles.btnPrimary}
        >
          {sending ? "Sending…" : `Send (${selectedIds.length})`}
        </button>
      </div>

      {termSheetFor && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true" data-testid="term-sheet-modal">
          <div style={styles.modalCard}>
            <div style={styles.modalTitle}>Term sheet — {termSheetFor.lenderName}</div>
            <div style={styles.modalHint}>{tsFile ? tsFile.name : "No file selected"}</div>
            <label style={styles.modalLabel}>Offer amount ($)
              <input type="number" value={tsAmount} onChange={(e) => setTsAmount(e.target.value)} style={styles.modalInput} placeholder="250000" />
            </label>
            <label style={styles.modalLabel}>Rate / factor
              <input type="text" value={tsRate} onChange={(e) => setTsRate(e.target.value)} style={styles.modalInput} placeholder="8.50% or 1.30 factor" />
            </label>
            <label style={styles.modalLabel}>Term
              <input type="text" value={tsTerm} onChange={(e) => setTsTerm(e.target.value)} style={styles.modalInput} placeholder="5 years" />
            </label>
            <label style={styles.modalLabel}>Payment frequency
              <select value={tsPayment} onChange={(e) => setTsPayment(e.target.value)} style={styles.modalInput}>
                <option value="">—</option>
                <option value="Monthly">Monthly</option>
                <option value="Bi-weekly">Bi-weekly</option>
                <option value="Weekly">Weekly</option>
                <option value="Daily">Daily</option>
              </select>
            </label>
            <label style={styles.modalLabel}>Expiry date
              <input type="date" value={tsExpiry} onChange={(e) => setTsExpiry(e.target.value)} style={styles.modalInput} />
            </label>
            <label style={styles.modalLabel}>Notes
              <textarea value={tsNotes} onChange={(e) => setTsNotes(e.target.value)} style={{ ...styles.modalInput, minHeight: 60, resize: "vertical" as const }} />
            </label>
            <div style={styles.modalActions}>
              <button type="button" onClick={resetTermSheet} disabled={uploadingFor === termSheetFor.matchId} style={styles.btn}>Cancel</button>
              <button
                type="button"
                data-testid="term-sheet-submit"
                onClick={() => void handleSubmitTermSheet()}
                disabled={!tsFile || uploadingFor === termSheetFor.matchId}
                style={(!tsFile || uploadingFor === termSheetFor.matchId) ? styles.btnPrimaryDisabled : styles.btnPrimary}
              >
                {uploadingFor === termSheetFor.matchId ? "Uploading…" : "Upload term sheet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
