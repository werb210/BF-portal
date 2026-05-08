// BF_LENDERS_TAB_REAL_v42 — Block 42-B
// BF_LENDERS_TAB_FIX_v55_PORTAL — funding-range column
// BF_PORTAL_BLOCK_v179_LENDERS_TAB_GATING_ROUTED_v1 — envelope-based gating.
// BF_PORTAL_BLOCK_v186_LENDERS_TAB_POLISH_v1 — drawer-parity polish:
//   • files-count column with dropdown menu listing files + Upload Term Sheet input
//   • Upload Term Sheet wired to POST /api/applications/:id/lenders/:lenderId/files
//     (kind=term_sheet), invalidates the envelope query on success.
//   • sticky Send-to-Selected footer (position: sticky; bottom: 0).
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
  const { data, isLoading, error } = useQuery<LenderEnvelope>({ queryKey: ["lenders", id, "envelope"], queryFn: ({ signal }) => fetchLenderEnvelope(id, { signal }), enabled: Boolean(id) });
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
  const mutation = useMutation({ mutationFn: (ids: string[]) => createLenderSubmission(id, ids), onSuccess: () => { setSelected([]); queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] }); } });
  const toggle = (matchId: string) => setSelected((cur) => cur.includes(matchId) ? cur.filter((x) => x !== matchId) : [...cur, matchId]);

  const handleSend = async () => { if (sending || selectedIds.length === 0) return; setSending(true); setSendError(null); try { await mutation.mutateAsync(selectedIds); } catch (err) { setSendError(getErrorMessage(err, "Unable to send to lenders.")); } finally { setSending(false); } };
  const handleRecalculate = async () => { if (recalculating) return; setRecalculating(true); setRecalcError(null); try { await recalculateLenderMatches(id); await queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] }); } catch (err) { setRecalcError(getErrorMessage(err, "Recalculate failed.")); } finally { setRecalculating(false); } };
  const handleUploadTermSheet = async (matchId: string, file: File) => {
    if (!file || !id) return;
    setUploadingFor(matchId); setUploadError(null);
    try { await uploadLenderTermSheet(id, matchId, file); await queryClient.invalidateQueries({ queryKey: ["lenders", id, "envelope"] }); }
    catch (err) { setUploadError(getErrorMessage(err, "Term sheet upload failed.")); }
    finally { setUploadingFor(null); }
  };

  if (!id) return <div className="drawer-placeholder">Select an application to view lenders.</div>;
  if (isLoading) return <div className="drawer-placeholder">Loading lenders…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load lenders.")}</div>;
  if (!canManage) return <AccessRestricted message="You do not have permission to view lender submissions." />;

  if (envelope.status === "locked") return <div data-testid="lenders-locked">Lender matching is locked</div>;
  const isStale = envelope.status === "stale";
  return <div ref={filesRootRef} data-testid="lenders-tab" style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 80 }}>
    {recalcError && <div role="alert">{recalcError}</div>}
    {sendError && <div role="alert">{sendError}</div>}
    {uploadError && <div role="alert">{uploadError}</div>}
    <ul aria-label="Lender list">{matches.map((m) => {
      const checked = selected.includes(m.id);
      const files = (m as any).files as Array<{ id: string; filename: string; url?: string | null }> | undefined;
      const fileCount = files?.length ?? 0;
      const filesOpen = filesOpenFor === m.id;
      const isUploading = uploadingFor === m.id;
      return <li key={m.id}><label><input type="checkbox" checked={checked} onChange={() => toggle(m.id)} disabled={sending || isStale} aria-label={`Send to ${(m as any).lenderName ?? "lender"}`} />Send</label>
        <div style={{ position: "relative" }}>
          <button type="button" data-testid={`lender-files-${m.id}`} onClick={() => setFilesOpenFor(filesOpen ? null : m.id)} disabled={isStale}>{fileCount} file{fileCount === 1 ? "" : "s"} ▾</button>
          {filesOpen ? <div role="menu" data-testid={`lender-files-menu-${m.id}`}>{fileCount === 0 ? <div>No files yet.</div> : (files ?? []).map((f) => <a key={f.id} href={f.url ?? "#"} target="_blank" rel="noopener noreferrer">{f.filename}</a>)}
            <label>{isUploading ? "Uploading…" : "⬆ Upload Term Sheet"}
              <input type="file" data-testid={`upload-term-sheet-${m.id}`} disabled={isUploading || isStale} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadTermSheet(m.id, f); e.currentTarget.value = ""; }} />
            </label>
          </div> : null}
        </div></li>;
    })}</ul>
    <div data-testid="lenders-send-footer" style={{ position: "sticky", bottom: 0 }}><button type="button" onClick={handleSend} disabled={sending || selectedIds.length === 0 || isStale}>{sending ? "Sending…" : `Send (${selectedIds.length})`}</button></div>
  </div>;
}
