// BF_PORTAL_v890_MAYA_LENDER_UPDATES - changes Maya heard in a Teams meeting with this lender. Nothing is saved until
// staff press Approve; Reject dismisses it. Shown above the products list when the selected lender has open suggestions.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";

export type LenderSuggestion = {
  id: string;
  target: "lender" | "product";
  product_id: string | null;
  product_name: string | null;
  field: string;
  label: string;
  current: string | number | null;
  proposed: string | number;
  reason: string;
  status: string;
};
type MeetingSuggestions = { meeting_id: string; subject: string | null; meeting_at: string | null; updates: LenderSuggestion[] };

const MONEY = new Set(["amount_min", "amount_max"]);
const PERCENT = new Set(["rate_min_num", "rate_max_num", "commission"]);
const MONTHS = new Set(["term_min", "term_max"]);

export function formatSuggestionValue(field: string, v: string | number | null): string {
  if (v === null || v === undefined || v === "") return "blank";
  if (MONEY.has(field)) return "$" + Number(v).toLocaleString("en-CA", { maximumFractionDigits: 0 });
  if (PERCENT.has(field)) return `${Number(v)}%`;
  if (MONTHS.has(field)) return `${Number(v)} months`;
  return String(v);
}

const NOTES = new Set(["internal_notes", "eligibility_notes"]);

export default function MayaLenderSuggestions({ lenderId }: { lenderId: string }) {
  const qc = useQueryClient();
  const key = ["lender-updates", lenderId];
  const { data, isError } = useQuery({
    queryKey: key,
    queryFn: () => api.get<{ meetings: MeetingSuggestions[] }>(`/api/lender-updates/lenders/${encodeURIComponent(lenderId)}`),
    staleTime: 30_000,
  });
  const decide = useMutation({
    mutationFn: (v: { meetingId: string; updateId: string; decision: "approve" | "reject" }) =>
      api.patch<{ update: LenderSuggestion }>(`/api/lender-updates/${v.meetingId}/${v.updateId}`, { decision: v.decision }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["lenders"] });
      void qc.invalidateQueries({ queryKey: ["lender-products"] });
    },
  });

  const meetings = data?.meetings ?? [];
  if (isError || meetings.length === 0) return null;
  const stale = decide.data?.update?.status === "stale";

  return (
    <section
      aria-label="Changes Maya heard in meetings"
      style={{ margin: "12px 20px 0", padding: "12px 14px", border: "1px solid var(--ui-border)", borderRadius: 10, background: "var(--ui-surface-strong)" }}
    >
      <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--ui-text)" }}>Changes Maya heard in meetings</h3>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--ui-text-muted)" }}>
        Nothing changes until you approve it.
      </p>
      {decide.isError && (
        <p role="alert" style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-danger, #b91c1c)" }}>{getErrorMessage(decide.error, "Could not save that change.")}</p>
      )}
      {stale && (
        <p role="status" style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ui-text)" }}>
          Not saved: that value was edited after the meeting. Check it on the lender or product.
        </p>
      )}
      {meetings.map((m) => (
        <div key={m.meeting_id} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted)", marginBottom: 4 }}>
            {m.subject || "Teams meeting"}
            {m.meeting_at ? ` · ${new Date(m.meeting_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}` : ""}
          </div>
          {m.updates.map((u) => {
            const busy = decide.isPending && decide.variables?.updateId === u.id && decide.variables?.meetingId === m.meeting_id;
            return (
              <div key={u.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid var(--ui-border)" }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ui-text)" }}>
                  <div>
                    <strong>{u.product_name ? `${u.product_name}: ` : ""}{u.label}</strong>{" "}
                    {NOTES.has(u.field) ? (
                      <span>add "{String(u.proposed)}"</span>
                    ) : (
                      <span>{formatSuggestionValue(u.field, u.current)} → {formatSuggestionValue(u.field, u.proposed)}</span>
                    )}
                  </div>
                  {u.reason && <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 2 }}>{u.reason}</div>}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide.mutate({ meetingId: m.meeting_id, updateId: u.id, decision: "approve" })}
                  style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: "var(--ui-accent-blue)", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide.mutate({ meetingId: m.meeting_id, updateId: u.id, decision: "reject" })}
                  style={{ padding: "5px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                >
                  Reject
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
