// BF_PORTAL_REJECTION_REASONS_v125
// One modal, two callers: a single lender passing, and the whole file being
// rejected. They differ only in wording and in what the server does afterwards,
// so they share a component rather than drifting apart.
//
// The catalogue is fetched, never hardcoded. Applicant-facing copy lives in the
// rejection_reasons table so it can be corrected without a portal deploy, and a
// hardcoded list here would silently diverge from what the email actually says.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";

export type RejectionReason = {
  code: string;
  label: string;
  why_it_matters: string;
  what_helps: string | null;
};

const s = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  card: { background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 10, padding: 20, width: 520, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" as const, boxShadow: "0 12px 40px rgba(0,0,0,0.2)" },
  title: { fontSize: 16, fontWeight: 700, color: "var(--ui-text)", marginBottom: 4 },
  hint: { fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 14, lineHeight: 1.5 },
  row: { display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--ui-border-soft)", alignItems: "flex-start" },
  label: { fontSize: 13, color: "var(--ui-text)", cursor: "pointer", lineHeight: 1.4 },
  helps: { fontSize: 11, color: "var(--ui-text-muted)", marginTop: 2, lineHeight: 1.45 },
  noHelp: { fontSize: 11, color: "var(--ui-text-muted)", marginTop: 2, fontStyle: "italic" as const },
  input: { display: "block", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const, minHeight: 62, resize: "vertical" as const },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted)", marginTop: 14 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  btn: { border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", padding: "8px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "var(--ui-text)", fontFamily: "inherit" },
  danger: { border: 0, background: "#b91c1c", color: "#fff", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  disabled: { border: 0, background: "var(--ui-surface-muted)", color: "#fff", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "not-allowed", fontFamily: "inherit" },
  warn: { fontSize: 12, color: "#b91c1c", background: "#b91c1c12", border: "1px solid #b91c1c33", borderRadius: 6, padding: "8px 10px", marginBottom: 12, lineHeight: 1.5 },
};

export function RejectReasonsModal(props: {
  mode: "lender" | "application";
  lenderName?: string;
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (reasonCodes: string[], note: string) => void;
}) {
  const { mode, lenderName, busy, onCancel, onSubmit } = props;
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["rejection-reasons"],
    queryFn: async () => {
      const r = await api.get<any>("/api/applications/rejection-reasons");
      return ((r as any)?.data ?? r) as { reasons?: RejectionReason[] };
    },
    staleTime: 5 * 60_000,
  });

  const reasons = useMemo(() => data?.reasons ?? [], [data]);
  const toggle = (code: string) =>
    setPicked((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));

  const isApp = mode === "application";

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" data-testid="reject-reasons-modal">
      <div style={s.card}>
        <div style={s.title}>
          {isApp ? "Reject application" : `Record pass — ${lenderName ?? "lender"}`}
        </div>
        <div style={s.hint}>
          {isApp
            ? "The applicant is emailed every reason selected, with what they can do about it, and the file moves to Rejected. This cannot be undone from here."
            : "The applicant sees these reasons on their portal. They are not emailed unless this is the last lender to pass, in which case the file closes automatically."}
        </div>

        {isApp && (
          <div style={s.warn}>
            This ends the file and sends the decline email immediately. Use a
            per-lender pass instead if other lenders are still deciding.
          </div>
        )}

        {isLoading ? (
          <div style={s.hint}>Loading reasons…</div>
        ) : reasons.length === 0 ? (
          <div style={s.hint}>No reasons are configured. Check the rejection_reasons table.</div>
        ) : (
          reasons.map((r) => (
            <label key={r.code} style={s.row} data-testid={`reject-reason-${r.code}`}>
              <input
                type="checkbox"
                checked={picked.includes(r.code)}
                onChange={() => toggle(r.code)}
                style={{ marginTop: 3 }}
              />
              <span style={s.label}>
                {r.label}
                {r.what_helps
                  ? <span style={s.helps}><br />{r.what_helps}</span>
                  : <span style={s.noHelp}><br />No action the applicant can take — time only.</span>}
              </span>
            </label>
          ))
        )}

        <label style={s.fieldLabel}>
          Note (optional) — specifics the standard copy cannot carry, e.g. "credit came in at 612, lenders here need 650"
          <textarea
            data-testid="reject-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={s.input}
            placeholder="Appended to the email verbatim. Leave blank if the reasons say enough."
          />
        </label>

        <div style={s.actions}>
          <button type="button" onClick={onCancel} disabled={busy} style={s.btn}>Cancel</button>
          <button
            type="button"
            data-testid="reject-submit"
            disabled={busy || picked.length === 0}
            onClick={() => onSubmit(picked, note.trim())}
            style={busy || picked.length === 0 ? s.disabled : s.danger}
          >
            {busy ? "Saving…" : isApp ? `Reject and email (${picked.length})` : `Record pass (${picked.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
