// BF_PORTAL_v72_BLOCK_2_6 — Lenders tab rebuild per locked spec.
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";

type SubmissionMethod = "email" | "api" | "google_sheet" | null;
type Likelihood = "high" | "medium" | "low" | null;

// BF_PORTAL_BLOCK_v178_LENDERS_TAB_GATING_v1
type EnvelopeStatus = "locked" | "stale" | "ready";
type LenderEnvelope = {
  status: EnvelopeStatus;
  outstanding: string[];
  computed_at: string | null;
  matches: any[];
};

type LenderRow = {
  id: string;
  name: string;
  logoUrl?: string | null;
  primary?: boolean;
  amount?: number | null;
  type?: SubmissionMethod;
  likelihood?: Likelihood;
  files?: Array<{ id: string; filename: string; url?: string | null }>;
};

type PendingOffer = {
  id: string;
  lenderName: string;
};

type Props = { applicationId: string };

const PAGE_SIZE = 10;

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function MethodBadge({ m }: { m: SubmissionMethod }) {
  if (!m) return <span style={{ color: "var(--ui-text-muted)" }}>—</span>;
  const map: Record<Exclude<SubmissionMethod, null>, { label: string; bg: string; fg: string }> = {
    email:        { label: "Email",        bg: "#dbeafe", fg: "var(--ui-accent-blue)" },
    api:          { label: "API",          bg: "#dcfce7", fg: "#166534" },
    google_sheet: { label: "Google Sheet", bg: "#fef3c7", fg: "#78350f" },
  };
  const c = map[m];
  return (
    <span style={{ background: c?.bg ?? "transparent", color: c?.fg ?? "inherit", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999 }}>
      {c.label}
    </span>
  );
}

function LikelihoodPill({ l }: { l: Likelihood }) {
  if (!l) return <span style={{ color: "var(--ui-text-muted)" }}>—</span>;
  const map: Record<Exclude<Likelihood, null>, { label: string; bg: string; fg: string }> = {
    high:   { label: "High",   bg: "#dcfce7", fg: "#166534" },
    medium: { label: "Medium", bg: "#fef3c7", fg: "#78350f" },
    low:    { label: "Low",    bg: "#fee2e2", fg: "#991b1b" },
  };
  const c = map[l];
  return (
    <span style={{ background: c?.bg ?? "transparent", color: c?.fg ?? "inherit", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999 }}>
      {c.label}
    </span>
  );
}

export default function LendersTab({ applicationId }: Props) {
  const [rows, setRows] = useState<LenderRow[]>([]);
  // BF_PORTAL_BLOCK_v178_LENDERS_TAB_GATING_v1
  const [envelopeStatus, setEnvelopeStatus] = useState<EnvelopeStatus>("locked");
  const [outstanding, setOutstanding] = useState<string[]>([]);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  async function handleRecalculate() {
    if (recalculating) return;
    setRecalculating(true);
    try {
      const env = await api.post<LenderEnvelope>(
        `/api/applications/${encodeURIComponent(applicationId)}/lenders/recalculate`,
        {}
      );
      setEnvelopeStatus(env.status);
      setOutstanding(env.outstanding ?? []);
      setComputedAt(env.computed_at);
      setRows(Array.isArray(env.matches) ? (env.matches as LenderRow[]) : []);
    } catch (e) {
      console.warn("[lenders] recalculate failed", e);
    } finally {
      setRecalculating(false);
    }
  }
  const [pending, setPending] = useState<PendingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filesOpen, setFilesOpen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        // BF_PORTAL_BLOCK_v178_LENDERS_TAB_GATING_v1
        // Switched to /envelope — returns {status, outstanding, computed_at, matches}.
        // Handles locked (required docs not all accepted), stale (cache flagged
        // after a reject), and ready (fresh cache) states.
        const [envelope, offers] = await Promise.all([
          api.get<LenderEnvelope>(`/api/applications/${encodeURIComponent(applicationId)}/lenders/envelope`),
          api.get<{ items?: PendingOffer[] } | PendingOffer[]>(`/api/applications/${encodeURIComponent(applicationId)}/offers?status=pending_acceptance`).catch(() => []),
        ]);
        if (!active) return;
        // v178: read matches + status from envelope
        const env = envelope ?? { status: "locked" as const, outstanding: [], computed_at: null, matches: [] };
        const list = Array.isArray(env.matches) ? (env.matches as LenderRow[]) : [];
        setEnvelopeStatus(env.status);
        setOutstanding(env.outstanding ?? []);
        setComputedAt(env.computed_at);
        const pendList = Array.isArray(offers) ? offers : offers?.items ?? [];
        setRows(list);
        setPending(pendList);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load lenders.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applicationId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const toggle = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sendSelected = async () => {
    if (selected.size === 0) return;
    setSending(true);
    setSendError(null);
    try {
      await api.post(`/api/applications/${encodeURIComponent(applicationId)}/lenders/send`, {
        lenderIds: Array.from(selected),
      });
      setSelected(new Set());
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  };

  const confirmAcceptance = async (offerId: string) => {
    try {
      await api.post(`/api/offers/${encodeURIComponent(offerId)}/confirm-acceptance`, {});
      setPending((cur) => cur.filter((o) => o.id !== offerId));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("confirm_acceptance_failed", e);
    }
  };

  const uploadTermSheet = async (lenderId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", "term_sheet");
    try {
      await api.post(`/api/applications/${encodeURIComponent(applicationId)}/lenders/${encodeURIComponent(lenderId)}/files`, form);
      // Refetch lender list so files dropdown updates
      // v178: refetch via envelope; matches may be empty when locked/stale.
      const env2 = await api.get<LenderEnvelope>(`/api/applications/${encodeURIComponent(applicationId)}/lenders/envelope`);
      setEnvelopeStatus(env2.status);
      setOutstanding(env2.outstanding ?? []);
      setComputedAt(env2.computed_at);
      setRows(Array.isArray(env2.matches) ? (env2.matches as LenderRow[]) : []);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("upload_term_sheet_failed", e);
    }
  };

  if (loading) return <div data-testid="lenders-loading">Loading lenders…</div>;
  if (error)   return <div data-testid="lenders-error" style={{ color: "#b91c1c" }}>{error}</div>;

  // BF_PORTAL_BLOCK_v178_LENDERS_TAB_GATING_v1
  if (envelopeStatus === "locked") {
    return (
      <div data-testid="lenders-locked" style={{ padding: 24 }}>
        <div style={{
          background: "var(--ui-surface-muted)",
          border: "1px solid var(--ui-border)",
          borderRadius: 12,
          padding: "20px 24px",
          maxWidth: 640,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ui-text)", marginBottom: 6 }}>
            Lender matching is locked
          </div>
          <div style={{ fontSize: 13, color: "var(--ui-text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
            Lender matches are computed once all required documents are accepted. Until
            then the inputs aren\'t stable enough to recommend lenders.
          </div>
          {outstanding.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ui-text-muted)", marginBottom: 8 }}>
                Outstanding ({outstanding.length})
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--ui-text)" }}>
                {outstanding.map((c) => <li key={c} style={{ marginBottom: 4 }}>{c}</li>)}
              </ul>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--ui-text-muted)", fontStyle: "italic" }}>
              Awaiting required-document list.
            </div>
          )}
        </div>
      </div>
    );
  }
  const isStale = envelopeStatus === "stale";

  return (
    <div data-testid="lenders-tab">
      {/* BF_PORTAL_BLOCK_v178_LENDERS_TAB_GATING_v1 */}
      {isStale && (
        <div style={{
          background: "#fef3c7",
          border: "1px solid #fcd34d",
          color: "#78350f",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
        }}>
          <span style={{ fontWeight: 700 }}>⚠ Matches are stale</span>
          <span style={{ flex: 1 }}>
            A document was rejected after the last computation. Recalculate to refresh.
            {computedAt && <span style={{ opacity: 0.7, marginLeft: 8 }}>Last computed: {new Date(computedAt).toLocaleString()}</span>}
          </span>
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            style={{
              background: recalculating ? "#fbbf24" : "#f59e0b",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: recalculating ? "default" : "pointer",
            }}
          >
            {recalculating ? "Recalculating…" : "Recalculate"}
          </button>
        </div>
      )}
      {pending.length > 0 ? (
        <div data-testid="pending-acceptance-banner" style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <strong>⏳ Pending Acceptance</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {pending.map((o) => (
              <li key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span>{o.lenderName} offer pending your confirmation</span>
                <button
                  type="button"
                  data-testid={`confirm-acceptance-${o.id}`}
                  onClick={() => void confirmAcceptance(o.id)}
                  style={{ padding: "4px 10px", border: "none", background: "var(--ui-accent-blue)", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                >
                  Confirm acceptance
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          data-testid="lenders-search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search lenders"
          style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--ui-border)", borderRadius: 6 }}
        />
      </div>

      <div style={{ background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "var(--ui-surface-muted)" }}>
            <tr>
              <th style={{ width: 32, padding: "8px 10px" }}></th>
              <th style={{ textAlign: "left", padding: "8px 10px" }}>Lender</th>
              <th style={{ textAlign: "right", padding: "8px 10px" }}>Amount</th>
              <th style={{ textAlign: "left", padding: "8px 10px" }}>Type</th>
              <th style={{ textAlign: "left", padding: "8px 10px" }}>Likelihood</th>
              <th style={{ textAlign: "left", padding: "8px 10px" }}>Files</th>
              <th style={{ width: 1, padding: "8px 10px" }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, color: "var(--ui-text-muted)", textAlign: "center" }}>
                  No matching lenders.
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr key={r.id} data-testid={`lender-row-${r.id}`} style={{ borderTop: "1px solid var(--ui-border-soft)" }}>
                  <td style={{ padding: "8px 10px" }}>
                    <input
                      type="checkbox"
                      data-testid={`lender-select-${r.id}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {r.logoUrl ? (
                        <img src={r.logoUrl} alt={r.name} style={{ width: 28, height: 28, objectFit: "contain", border: "1px solid var(--ui-border)", borderRadius: 4 }} />
                      ) : (
                        <div style={{ width: 28, height: 28, background: "var(--ui-surface-muted)", borderRadius: 4 }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        {r.primary ? (
                          <span style={{ background: "#dbeafe", color: "var(--ui-accent-blue)", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999 }}>PRIMARY</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtMoney(r.amount ?? null)}</td>
                  <td style={{ padding: "8px 10px" }}><MethodBadge m={r.type ?? null} /></td>
                  <td style={{ padding: "8px 10px" }}><LikelihoodPill l={r.likelihood ?? null} /></td>
                  <td style={{ padding: "8px 10px", position: "relative" }}>
                    <button
                      type="button"
                      data-testid={`lender-files-${r.id}`}
                      onClick={() => setFilesOpen(filesOpen === r.id ? null : r.id)}
                      style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                    >
                      {r.files?.length ?? 0} file{(r.files?.length ?? 0) === 1 ? "" : "s"} ▾
                    </button>
                    {filesOpen === r.id ? (
                      <div role="menu" style={{ position: "absolute", left: 0, top: "calc(100% + 4px)", background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 1, minWidth: 200, padding: 8 }}>
                        {(r.files ?? []).length === 0 ? (
                          <div style={{ color: "var(--ui-text-muted)", fontSize: 12, padding: "4px 6px" }}>No files yet.</div>
                        ) : (
                          (r.files ?? []).map((f) => (
                            <a key={f.id} href={f.url ?? "#"} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "4px 6px", color: "#111", textDecoration: "none", fontSize: 12 }}>
                              {f.filename}
                            </a>
                          ))
                        )}
                        <label style={{ display: "block", padding: "6px", borderTop: "1px solid var(--ui-border-soft)", marginTop: 6, color: "var(--ui-accent-blue)", cursor: "pointer", fontSize: 12 }}>
                          ⬆ Upload Term Sheet
                          <input
                            type="file"
                            data-testid={`upload-term-sheet-${r.id}`}
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadTermSheet(r.id, file);
                            }}
                          />
                        </label>
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                    <button type="button" style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 6, cursor: "pointer", fontSize: 12, marginRight: 4 }}>Detail</button>
                    <button type="button" style={{ padding: "4px 10px", border: "1px solid #fecaca", color: "#b91c1c", background: "var(--ui-surface-strong)", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>
          Page {page} of {pageCount} · {filtered.length} lender{filtered.length === 1 ? "" : "s"}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 6, cursor: page > 1 ? "pointer" : "not-allowed", fontSize: 12, opacity: page > 1 ? 1 : 0.5 }}>‹ Prev</button>
          <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} style={{ padding: "4px 10px", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", borderRadius: 6, cursor: page < pageCount ? "pointer" : "not-allowed", fontSize: 12, opacity: page < pageCount ? 1 : 0.5 }}>Next ›</button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        {sendError ? <span style={{ color: "#b91c1c", fontSize: 12, alignSelf: "center" }}>{sendError}</span> : null}
        <button
          type="button"
          data-testid="send-to-selected"
          disabled={selected.size === 0 || sending}
          onClick={() => void sendSelected()}
          style={{ padding: "8px 14px", border: "none", background: selected.size > 0 ? "var(--ui-accent-blue)" : "#9ca3af", color: "#fff", borderRadius: 6, cursor: selected.size > 0 ? "pointer" : "not-allowed", fontWeight: 600 }}
        >
          {sending ? "Sending…" : `Send to ${selected.size} selected lender${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
