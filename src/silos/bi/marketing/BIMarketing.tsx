// BF_PORTAL_BLOCK_v204_APOLLO_MARKETING_UI_v1
// Apollo dashboard under BI silo. Status banner shows whether
// APOLLO_API_KEY is configured on BI-Server (live=true) or the
// service is running in mock mode. Mailbox health cards and
// sequence list both render against v253 endpoints.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";

type MailboxHealth = {
  id: string;
  email?: string;
  status?: string;
  health_score?: number;
  bounce_rate?: number;
  reply_rate?: number;
};

type HealthResponse = {
  ok: boolean;
  live: boolean;
  mock: boolean;
  mailboxes: MailboxHealth[];
};

type SequenceRow = {
  id: string;
  apollo_sequence_id: string | null;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SequencesResponse = {
  ok: boolean;
  live: boolean;
  sequences: SequenceRow[];
};

function pct(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export default function BIMarketing() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [seqLive, setSeqLive] = useState<boolean>(false);
  const [seqErr, setSeqErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadHealth = useCallback(async () => {
    try {
      const r = await api<HealthResponse>("/api/v1/bi/apollo/health");
      setHealth(r);
      setHealthErr(null);
    } catch (e: any) {
      setHealth(null);
      setHealthErr(e?.message ?? "Failed to reach Apollo.");
    }
  }, []);

  const loadSequences = useCallback(async (opts: { sync?: boolean } = {}) => {
    try {
      const path = opts.sync
        ? "/api/v1/bi/apollo/sequences?sync=true"
        : "/api/v1/bi/apollo/sequences";
      const r = await api<SequencesResponse>(path);
      setSequences(Array.isArray(r?.sequences) ? r.sequences : []);
      setSeqLive(Boolean(r?.live));
      setSeqErr(null);
    } catch (e: any) {
      setSequences([]);
      setSeqErr(e?.message ?? "Failed to load sequences.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadHealth(), loadSequences()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHealth, loadSequences]);

  async function onSync() {
    setSyncing(true);
    try {
      await loadSequences({ sync: true });
    } finally {
      setSyncing(false);
    }
  }

  const live = Boolean(health?.live);
  const mock = Boolean(health?.mock);

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-6" data-testid="bi-marketing">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold">Marketing — Apollo</h2>
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs " +
              (live
                ? "bg-green-500/15 text-green-300 border border-green-500/30"
                : "bg-yellow-500/10 text-yellow-300 border border-yellow-500/30")
            }
            data-testid="apollo-status-badge"
          >
            <span
              className={
                "inline-block w-1.5 h-1.5 rounded-full " +
                (live ? "bg-green-400" : "bg-yellow-400")
              }
            />
            {live ? "Apollo: live" : "Apollo: demo (mock data)"}
          </span>
          <button
            type="button"
            onClick={() => {
              void loadHealth();
              void loadSequences();
            }}
            className="px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15"
          >
            Refresh
          </button>
        </div>
      </div>

      {!live && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-200">
          APOLLO_API_KEY is not yet set on BI-Server. You're seeing mock data
          so the page can be reviewed end-to-end. Setting the env var on
          Azure flips this to live — no code change.
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl">Mailbox health</h3>
          {mock && (
            <span className="text-xs text-white/60">mock</span>
          )}
        </div>
        {loading && <p className="text-sm text-white/60">Loading…</p>}
        {healthErr && <p className="text-sm text-red-400">{healthErr}</p>}
        {!loading && !healthErr && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(health?.mailboxes ?? []).map((m) => (
              <div
                key={m.id}
                className="bg-brand-surface border border-card rounded-xl p-4"
                data-testid="apollo-mailbox-card"
              >
                <div className="flex items-center justify-between">
                  <strong className="truncate">{m.email ?? m.id}</strong>
                  <span
                    className={
                      "px-1.5 py-0.5 rounded text-[10px] uppercase " +
                      (m.status === "active"
                        ? "bg-green-500/15 text-green-300"
                        : "bg-white/10 text-white/60")
                    }
                  >
                    {m.status ?? "unknown"}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-white/40">Score</dt>
                    <dd className="text-lg text-white">
                      {m.health_score ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Bounce</dt>
                    <dd className="text-lg text-white">
                      {pct(m.bounce_rate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Reply</dt>
                    <dd className="text-lg text-white">
                      {pct(m.reply_rate)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
            {(health?.mailboxes ?? []).length === 0 && (
              <p className="text-sm text-white/50">No mailboxes configured.</p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl">Sequences</h3>
          <div className="flex items-center gap-2">
            {!seqLive && sequences.length > 0 && (
              <span className="text-xs text-white/60">demo</span>
            )}
            <button
              type="button"
              onClick={() => void onSync()}
              disabled={syncing || !live}
              title={
                live
                  ? "Pull the latest sequence list from Apollo"
                  : "Sync requires APOLLO_API_KEY set on BI-Server"
              }
              className="px-3 py-1 rounded-md text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? "Syncing…" : "Sync from Apollo"}
            </button>
          </div>
        </div>
        {seqErr && <p className="text-sm text-red-400">{seqErr}</p>}
        {!seqErr && sequences.length === 0 && !loading && (
          <p className="text-sm text-white/50">
            No sequences yet.{" "}
            {live
              ? "Click Sync from Apollo to import them."
              : "Set APOLLO_API_KEY to import from Apollo."}
          </p>
        )}
        {sequences.length > 0 && (
          <div className="bg-brand-surface border border-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Apollo ID</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-card"
                    data-testid="apollo-sequence-row"
                  >
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2 text-white/60 font-mono text-xs">
                      {s.apollo_sequence_id ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {s.is_active ? (
                        <span className="text-green-300">●</span>
                      ) : (
                        <span className="text-white/40">○</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-white/60">
                      {new Date(s.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
