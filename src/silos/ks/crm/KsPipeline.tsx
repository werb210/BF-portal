// BF_PORTAL_v850_KS_CRM - the Keystone sales pipeline: Lead -> Demo started -> Demo finished -> Signed up -> Paying,
// plus Lost. One card per Keystone company (with its first contact) and per Keystone contact without a company.
// KS-Ops moves cards forward automatically (demo progress, sign-ups, Stripe payments); staff drag a card to another
// column, or pick the stage from the card's menu (works on the iPad too). BF-Server: GET /api/ks/crm/pipeline,
// PATCH /api/ks/crm/pipeline/stage.
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { KS_ACCENT } from "../ksAccess";

export type KsStageKey = "lead" | "demo_started" | "demo_finished" | "signed_up" | "paying" | "lost";

export const KS_STAGES: Array<{ key: KsStageKey; label: string }> = [
  { key: "lead", label: "Lead" },
  { key: "demo_started", label: "Demo started" },
  { key: "demo_finished", label: "Demo finished" },
  { key: "signed_up", label: "Signed up" },
  { key: "paying", label: "Paying" },
  { key: "lost", label: "Lost" },
];

export type KsCard = {
  kind: "company" | "contact";
  id: string;
  stage: KsStageKey;
  company_id: string | null;
  company_name: string | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  plan: string | null;
  seats: number | null;
  status: string | null;
  demo_opened_at: string | null;
  demo_steps: number;
  demo_completed_at: string | null;
  last_event_summary: string | null;
  last_event_at: string | null;
  updated_at: string | null;
};

type PipelineResponse = { stages?: Array<{ key: KsStageKey; label: string }>; cards?: KsCard[] };

const BASE = "/silo/ks/crm";

export function demoProgress(card: Pick<KsCard, "demo_opened_at" | "demo_steps" | "demo_completed_at">): string | null {
  if (card.demo_completed_at) return "Demo finished";
  if (card.demo_steps > 0) return `Demo: ${card.demo_steps} step${card.demo_steps === 1 ? "" : "s"} done`;
  if (card.demo_opened_at) return "Demo opened";
  return null;
}

export function planLine(card: Pick<KsCard, "plan" | "seats" | "status">): string | null {
  const parts = [
    card.plan ? `Plan: ${card.plan}` : null,
    card.seats != null ? `${card.seats} seat${card.seats === 1 ? "" : "s"}` : null,
    card.status,
  ];
  const text = parts.filter(Boolean).join(" - ");
  return text || null;
}

const cardKey = (c: Pick<KsCard, "kind" | "id">) => `${c.kind}:${c.id}`;

export default function KsPipeline() {
  const [cards, setCards] = useState<KsCard[]>([]);
  const [stages, setStages] = useState(KS_STAGES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState<KsStageKey | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const path = q.trim() ? `/api/ks/crm/pipeline?q=${encodeURIComponent(q.trim())}` : "/api/ks/crm/pipeline";
      const r = await api.get<PipelineResponse>(path);
      setCards(Array.isArray(r?.cards) ? r.cards : []);
      if (Array.isArray(r?.stages) && r.stages.length) setStages(r.stages);
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : "Could not load the Keystone pipeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const byStage = useMemo(() => {
    const out: Record<string, KsCard[]> = {};
    for (const s of stages) out[s.key] = [];
    for (const c of cards) (out[c.stage] ?? (out[c.stage] = [])).push(c);
    return out;
  }, [cards, stages]);

  const move = useCallback(
    async (card: KsCard, stage: KsStageKey) => {
      if (card.stage === stage) return;
      const before = card.stage;
      setNotice(null);
      setError(null);
      setCards((prev) => prev.map((c) => (cardKey(c) === cardKey(card) ? { ...c, stage } : c)));
      try {
        await api.patch("/api/ks/crm/pipeline/stage", { kind: card.kind, id: card.id, stage });
        const label = stages.find((s) => s.key === stage)?.label ?? stage;
        setNotice(`${card.company_name ?? card.contact_name ?? "Card"} moved to ${label}.`);
      } catch (e: unknown) {
        setCards((prev) => prev.map((c) => (cardKey(c) === cardKey(card) ? { ...c, stage: before } : c)));
        setError(e instanceof Error && e.message ? `Could not move the card: ${e.message}` : "Could not move the card.");
      }
    },
    [stages],
  );

  const onDrop = (stage: KsStageKey) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragOver(null);
    const key = e.dataTransfer.getData("text/plain");
    const card = cards.find((c) => cardKey(c) === key);
    if (card) void move(card, stage);
  };

  return (
    <div style={{ padding: "16px 24px" }} data-testid="ks-pipeline">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Keystone sales pipeline</h1>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, company code"
          aria-label="Search the pipeline"
          style={searchInput}
        />
        <span style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>
          {loading ? "Loading..." : `${cards.length} in the pipeline`}
        </span>
      </div>
      {error ? (
        <p role="alert" style={{ color: "var(--ui-text-danger, #b91c1c)", margin: "0 0 8px" }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" style={{ color: "var(--ui-text-muted)", margin: "0 0 8px" }}>
          {notice}
        </p>
      ) : null}
      <div style={board}>
        {stages.map((s) => {
          const list = byStage[s.key] ?? [];
          return (
            <section
              key={s.key}
              aria-label={`${s.label} (${list.length})`}
              data-testid={`ks-stage-${s.key}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(s.key);
              }}
              onDragLeave={() => setDragOver((cur) => (cur === s.key ? null : cur))}
              onDrop={onDrop(s.key)}
              style={{ ...column, ...(dragOver === s.key ? { borderColor: KS_ACCENT } : null) }}
            >
              <h2 style={columnTitle}>
                {s.label} <span style={{ color: "var(--ui-text-muted)", fontWeight: 500 }}>({list.length})</span>
              </h2>
              {list.map((c) => (
                <PipelineCard key={cardKey(c)} card={c} stages={stages} onMove={(stage) => void move(c, stage)} />
              ))}
              {!loading && list.length === 0 ? (
                <p style={{ color: "var(--ui-text-muted)", fontSize: 13, margin: 0 }}>Nobody here yet.</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PipelineCard({
  card,
  stages,
  onMove,
}: {
  card: KsCard;
  stages: Array<{ key: KsStageKey; label: string }>;
  onMove: (s: KsStageKey) => void;
}) {
  const title =
    card.kind === "company" ? card.company_name ?? "Company" : card.contact_name ?? card.contact_email ?? "Contact";
  const titleLink = card.kind === "company" ? `${BASE}/companies/${card.id}` : `${BASE}/contacts/${card.id}`;
  const demo = demoProgress(card);
  const plan = planLine(card);
  return (
    <article
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", cardKey(card))}
      data-testid={`ks-card-${card.id}`}
      style={cardStyle}
    >
      <Link to={titleLink} style={{ color: "var(--ui-text)", fontWeight: 700, textDecoration: "underline" }}>
        {title}
      </Link>
      {card.kind === "company" && card.contact_id ? (
        <div style={line}>
          <Link to={`${BASE}/contacts/${card.contact_id}`} style={{ color: "var(--ui-text)" }}>
            {card.contact_name ?? card.contact_email ?? "Contact"}
          </Link>
        </div>
      ) : null}
      {card.contact_email ? <div style={muted}>{card.contact_email}</div> : null}
      {card.contact_phone ? <div style={muted}>{card.contact_phone}</div> : null}
      {demo ? <div style={line}>{demo}</div> : null}
      {plan ? <div style={line}>{plan}</div> : null}
      {card.last_event_summary ? <div style={muted}>{card.last_event_summary}</div> : null}
      <label style={{ ...muted, display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        Stage
        <select
          value={card.stage}
          onChange={(e) => onMove(e.target.value as KsStageKey)}
          aria-label={`Stage for ${title}`}
          style={select}
        >
          {stages.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

const board: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(200px, 1fr))",
  gap: 12,
  overflowX: "auto",
  alignItems: "start",
};
const column: CSSProperties = {
  background: "var(--ui-surface)",
  border: "1px solid var(--ui-border)",
  borderRadius: 12,
  padding: 10,
  minHeight: 160,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const columnTitle: CSSProperties = { fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: "var(--ui-text)" };
const cardStyle: CSSProperties = {
  background: "var(--ui-surface-strong)",
  border: "1px solid var(--ui-border)",
  borderLeft: `4px solid ${KS_ACCENT}`,
  borderRadius: 8,
  padding: 10,
  fontSize: 13,
  color: "var(--ui-text)",
  cursor: "grab",
};
const line: CSSProperties = { marginTop: 4 };
const muted: CSSProperties = { marginTop: 2, color: "var(--ui-text-muted)", fontSize: 12 };
const select: CSSProperties = {
  minHeight: 32,
  borderRadius: 6,
  border: "1px solid var(--ui-border)",
  background: "var(--ui-surface-input, var(--ui-surface))",
  color: "var(--ui-text)",
  fontSize: 12,
};
const searchInput: CSSProperties = {
  minHeight: 36,
  minWidth: 240,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--ui-border)",
  background: "var(--ui-surface-input, var(--ui-surface))",
  color: "var(--ui-text)",
  fontSize: 14,
};
