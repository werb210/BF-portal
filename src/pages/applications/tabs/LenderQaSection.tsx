// BF_PORTAL_LENDER_QA_v1
// Lenders-tab Q&A: staff compose 1-99 questions, send to the client's CMP,
// review returned answers (accept / reject-with-reason), finalize when all are
// accepted, and download the PDF to email the lender.
import { useCallback, useEffect, useState } from "react";
import { api, rawApiFetch } from "@/api/index";

type Question = {
  id: string;
  position: number;
  prompt: string;
  request_document: boolean;
  answer_text: string | null;
  answer_document_id: string | null;
  review_status: string; // draft | sent | answered | accepted | rejected
  reject_reason: string | null;
};
type QaSet = {
  id: string;
  round: number;
  status: string; // draft | sent | answered | finalized | withdrawn
  questions: Question[];
};

const SET_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent to client",
  answered: "Answers received",
  finalized: "Finalized",
  withdrawn: "Withdrawn",
};
const Q_LABEL: Record<string, string> = {
  draft: "Not sent",
  sent: "Awaiting answer",
  answered: "Answered - review",
  accepted: "Accepted",
  rejected: "Returned to client",
};

const S: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 28, borderTop: "1px solid var(--ui-border, #e5e7eb)", paddingTop: 20 },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 18, fontWeight: 700 },
  sub: { fontSize: 13, color: "var(--ui-text-muted, #6b7280)", marginTop: 2 },
  card: { border: "1px solid var(--ui-border, #e5e7eb)", borderRadius: 10, padding: 16, marginTop: 14 },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  badge: { fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#f1f5f9", color: "#334155" },
  q: { padding: "10px 0", borderTop: "1px solid var(--ui-border, #f1f5f9)" },
  qPrompt: { fontWeight: 600, fontSize: 14 },
  qMeta: { fontSize: 12, color: "var(--ui-text-muted, #6b7280)", marginTop: 2 },
  answer: { marginTop: 6, fontSize: 14, whiteSpace: "pre-wrap" as const },
  reason: { marginTop: 6, fontSize: 13, color: "#b45309" },
  row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const, marginTop: 8 },
  input: { flex: 1, minWidth: 200, padding: "8px 10px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8 },
  textarea: { width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box" as const },
  btn: { padding: "7px 12px", fontSize: 13, border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, cursor: "pointer", color: "#0f172a" },
  btnPrimary: { padding: "7px 12px", fontSize: 13, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", borderRadius: 8, cursor: "pointer" },
  btnDanger: { padding: "7px 12px", fontSize: 13, border: "1px solid #ef4444", background: "#fff", color: "#b91c1c", borderRadius: 8, cursor: "pointer" },
  btnGhost: { padding: "4px 8px", fontSize: 12, border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer" },
  err: { marginTop: 10, fontSize: 13, color: "#b91c1c" },
  empty: { marginTop: 10, fontSize: 13, color: "var(--ui-text-muted, #6b7280)" },
  check: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" },
};

export default function LenderQaSection({ applicationId }: { applicationId?: string | null }) {
  const id = applicationId ?? "";
  const [sets, setSets] = useState<QaSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState<Record<string, string>>({});
  const [newDoc, setNewDoc] = useState<Record<string, boolean>>({});
  const [rejecting, setRejecting] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await api.get<{ items: QaSet[] }>(
        `/api/portal/applications/${encodeURIComponent(id)}/qa/sets`,
      );
      setSets(r.items ?? []);
    } catch {
      setErr("Unable to load lender questions.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setErr(null);
      try {
        await fn();
        await load();
      } catch {
        setErr("That action did not go through. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const base = `/api/portal/applications/${encodeURIComponent(id)}/qa`;

  const createSet = () => run(() => api.post(`${base}/sets`, {}));
  const addQuestion = (setId: string) => {
    const prompt = (newPrompt[setId] ?? "").trim();
    if (!prompt) return;
    return run(async () => {
      await api.post(`${base}/sets/${setId}/questions`, {
        prompt,
        request_document: Boolean(newDoc[setId]),
      });
      setNewPrompt((p) => ({ ...p, [setId]: "" }));
      setNewDoc((p) => ({ ...p, [setId]: false }));
    });
  };
  const deleteQuestion = (qid: string) => run(() => api.delete(`${base}/questions/${qid}`));
  const submitSet = (setId: string) => run(() => api.post(`${base}/sets/${setId}/submit`, {}));
  const withdrawSet = (setId: string) => run(() => api.post(`${base}/sets/${setId}/withdraw`, {}));
  const accept = (qid: string) => run(() => api.post(`${base}/questions/${qid}/accept`, {}));
  // BF_PORTAL_QA_ACCEPT_ALL_v1 — accept every answered question in one click;
  // run() reloads once at the end, then Finalize -> PDF proceeds as before.
  const acceptAll = (set: QaSet) =>
    run(async () => {
      for (const q of set.questions.filter((x) => x.review_status === "answered")) {
        await api.post(`${base}/questions/${q.id}/accept`, {});
      }
    });
  const doReject = (qid: string) => {
    const reason = (rejecting[qid] ?? "").trim();
    if (!reason) return;
    return run(async () => {
      await api.post(`${base}/questions/${qid}/reject`, { reason });
      setRejecting((p) => {
        const n = { ...p };
        delete n[qid];
        return n;
      });
    });
  };
  const finalize = (setId: string) => run(() => api.post(`${base}/sets/${setId}/finalize`, {}));
  const download = async (setId: string, round: number) => {
    setErr(null);
    try {
      const resp = await rawApiFetch(`${base}/sets/${setId}/export`);
      if (!resp.ok) throw new Error("download");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lender-questions-round-${round}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErr("Download failed.");
    }
  };

  if (!id) return null;

  const activeSets = sets.filter((s) => s.status !== "withdrawn");

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <div style={S.title}>Lender questions</div>
          <div style={S.sub}>
            Ask the applicant questions, review their answers, then attach the finalized form to the lender package.
          </div>
        </div>
        <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => void createSet()}>
          New question set
        </button>
      </div>

      {loading ? <div style={S.empty}>Loading...</div> : null}
      {!loading && activeSets.length === 0 ? (
        <div style={S.empty}>No question sets yet. Create one to ask the applicant for more information.</div>
      ) : null}

      {activeSets.map((set) => {
        const draftQs = set.questions.filter((q) => q.review_status === "draft");
        const hasDraft = draftQs.length > 0;
        const answered = set.questions.filter((q) => q.review_status === "answered");
        const allAccepted =
          set.questions.length > 0 && set.questions.every((q) => q.review_status === "accepted");
        const isFinal = set.status === "finalized";
        const canCompose = set.status === "draft" || set.status === "sent";

        return (
          <div key={set.id} style={S.card}>
            <div style={S.cardHead}>
              <div style={{ fontWeight: 700 }}>Round {set.round}</div>
              <span style={S.badge}>{SET_LABEL[set.status] ?? set.status}</span>
            </div>

            {set.questions.length === 0 ? (
              <div style={S.empty}>No questions yet.</div>
            ) : (
              set.questions.map((q, i) => (
                <div key={q.id} style={S.q}>
                  <div style={S.qPrompt}>
                    {i + 1}. {q.prompt}
                    {q.request_document ? "  (document requested)" : ""}
                  </div>
                  <div style={S.qMeta}>{Q_LABEL[q.review_status] ?? q.review_status}</div>

                  {q.answer_text ? <div style={S.answer}>{q.answer_text}</div> : null}
                  {q.review_status === "rejected" && q.reject_reason ? (
                    <div style={S.reason}>Returned: {q.reject_reason}</div>
                  ) : null}

                  {q.review_status === "draft" && canCompose ? (
                    <div style={S.row}>
                      <button type="button" style={S.btnGhost} disabled={busy} onClick={() => void deleteQuestion(q.id)}>
                        Delete
                      </button>
                    </div>
                  ) : null}

                  {q.review_status === "answered" ? (
                    <div style={S.row}>
                      <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => void accept(q.id)}>
                        Accept
                      </button>
                      <input
                        style={S.input}
                        placeholder="Reason for sending back..."
                        value={rejecting[q.id] ?? ""}
                        onChange={(e) => setRejecting((p) => ({ ...p, [q.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        style={S.btnDanger}
                        disabled={busy || !(rejecting[q.id] ?? "").trim()}
                        onClick={() => void doReject(q.id)}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}

            {canCompose ? (
              <div style={{ marginTop: 12 }}>
                <textarea
                  style={S.textarea}
                  rows={2}
                  placeholder="Type a question for the applicant..."
                  value={newPrompt[set.id] ?? ""}
                  onChange={(e) => setNewPrompt((p) => ({ ...p, [set.id]: e.target.value }))}
                />
                <div style={S.row}>
                  <label style={S.check}>
                    <input
                      type="checkbox"
                      checked={Boolean(newDoc[set.id])}
                      onChange={(e) => setNewDoc((p) => ({ ...p, [set.id]: e.target.checked }))}
                    />
                    Also request a document
                  </label>
                  <button
                    type="button"
                    style={S.btn}
                    disabled={busy || set.questions.length >= 99 || !(newPrompt[set.id] ?? "").trim()}
                    onClick={() => void addQuestion(set.id)}
                  >
                    Add question
                  </button>
                </div>
              </div>
            ) : null}

            <div style={S.row}>
              {hasDraft ? (
                <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => void submitSet(set.id)}>
                  Send to client
                </button>
              ) : null}
              {answered.length > 0 ? (
                <span style={S.qMeta}>{answered.length} answer(s) awaiting review</span>
              ) : null}
              {answered.length > 0 ? (
                <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => void acceptAll(set)}>
                  Accept all ({answered.length})
                </button>
              ) : null}
              {allAccepted && !isFinal ? (
                <button type="button" style={S.btnPrimary} disabled={busy} onClick={() => void finalize(set.id)}>
                  Finalize
                </button>
              ) : null}
              {isFinal ? (
                <button type="button" style={S.btn} onClick={() => void download(set.id, set.round)}>
                  Download PDF
                </button>
              ) : null}
              {!isFinal && set.status !== "draft" ? (
                <button type="button" style={S.btnGhost} disabled={busy} onClick={() => void withdrawSet(set.id)}>
                  Withdraw set
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {err ? <div style={S.err}>{err}</div> : null}
    </div>
  );
}
