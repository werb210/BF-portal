// BF_PORTAL_BLOCK_v_SLF_VIEW_v1 - view-only SLF silo. SLF deal data is a
// read-only mirror synced from BuildingDigital and served by slf-server under
// /api/slf/* (routed there by resolveApiBase). There are NO writes: no stage
// moves, no notes, no uploads. This single page is the SLF dashboard: stats on
// top, a read-only stage board below, and a read-only detail drawer per deal.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";

type SlfDeal = {
  id: number | string;
  product_family?: string | null;
  amount?: number | string | null;
  stage?: string | null;
  company_name?: string | null;
  city?: string | null;
  province?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  lender_name?: string | null;
  offer_status?: string | null;
  file_count?: number | string | null;
  contract_count?: number | string | null;
};

type SlfStats = {
  byStage: { stage: string | null; n: number | string; total: number | string }[];
  byFamily: { product_family: string | null; n: number | string }[];
  recentSyncs: { started_at?: string; status?: string; family?: string }[];
};

type SlfNote = { source?: string; author?: string | null; text?: string | null };
type SlfDetail = {
  request: Record<string, unknown> | null;
  sub: Record<string, unknown> | null;
  users: Record<string, unknown>[];
  contracts: Record<string, unknown>[];
  offers: Record<string, unknown>[];
  files: Record<string, unknown>[];
  notes: SlfNote[];
};

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
};
const money = (v: unknown): string =>
  num(v).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const titleCase = (s?: string | null): string =>
  (s && s.trim() ? s : "unknown").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fullName = (d: SlfDeal): string => [d.first_name, d.last_name].filter(Boolean).join(" ").trim();

function KV({ obj }: { obj: Record<string, unknown> | null }) {
  if (!obj) return <p className="text-sm text-slate-400">None</p>;
  const entries = Object.entries(obj).filter(
    ([, v]) => v !== null && v !== undefined && typeof v !== "object"
  );
  if (entries.length === 0) return <p className="text-sm text-slate-400">None</p>;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500">{titleCase(k)}</dt>
          <dd className="text-slate-900 break-words">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-200 px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
        {typeof count === "number" ? <span className="ml-1 text-slate-400">({count})</span> : null}
      </h3>
      {children}
    </section>
  );
}

function DealDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading, error } = useQuery<SlfDetail>({
    queryKey: ["slf", "deal", id],
    queryFn: ({ signal }) => api.get<SlfDetail>(`/api/slf/deals/${id}`, { signal }),
    enabled: !!id,
  });
  if (!id) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            SLF Deal #{id} <span className="ml-2 text-xs font-normal text-slate-400">read-only</span>
          </h2>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
            Close
          </button>
        </div>
        {isLoading ? <p className="px-4 py-6 text-sm text-slate-500">Loading...</p> : null}
        {error ? <p className="px-4 py-6 text-sm text-red-600">Couldn't load this deal.</p> : null}
        {data ? (
          <div className="pb-8">
            <Section title="Request">
              <KV obj={data.request} />
            </Section>
            <Section title="Applicant / Sub">
              <KV obj={data.sub} />
            </Section>
            <Section title="Contacts" count={data.users?.length ?? 0}>
              {data.users?.length ? (
                <div className="space-y-2">
                  {data.users.map((u, i) => (
                    <div key={i} className="rounded border border-slate-100 p-2">
                      <KV obj={u} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">None</p>
              )}
            </Section>
            <Section title="Contracts" count={data.contracts?.length ?? 0}>
              {data.contracts?.length ? (
                <div className="space-y-2">
                  {data.contracts.map((k, i) => (
                    <div key={i} className="rounded border border-slate-100 p-2">
                      <KV obj={k} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">None</p>
              )}
            </Section>
            <Section title="Offers" count={data.offers?.length ?? 0}>
              {data.offers?.length ? (
                <div className="space-y-2">
                  {data.offers.map((o, i) => (
                    <div key={i} className="rounded border border-slate-100 p-2">
                      <KV obj={o} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">None</p>
              )}
            </Section>
            <Section title="Files" count={data.files?.length ?? 0}>
              {data.files?.length ? (
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {data.files.map((f, i) => (
                    <li key={i} className="break-words">
                      {String(f["filename"] ?? f["name"] ?? f["id"] ?? "file")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">None</p>
              )}
            </Section>
            <Section title="Notes" count={data.notes?.length ?? 0}>
              {data.notes?.length ? (
                <ul className="space-y-2 text-sm">
                  {data.notes.map((n, i) => (
                    <li key={i} className="rounded bg-slate-50 p-2">
                      <span className="mr-1 rounded bg-slate-200 px-1 text-xs text-slate-600">{n.source ?? "note"}</span>
                      {n.author ? <span className="mr-1 font-medium text-slate-700">{n.author}:</span> : null}
                      <span className="text-slate-800">{n.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">None</p>
              )}
            </Section>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export default function SLFView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useQuery<SlfStats>({
    queryKey: ["slf", "stats"],
    queryFn: ({ signal }) => api.get<SlfStats>("/api/slf/stats", { signal }),
  });
  const dealsQ = useQuery<SlfDeal[]>({
    queryKey: ["slf", "deals"],
    queryFn: ({ signal }) => api.get<SlfDeal[]>("/api/slf/deals", { params: { limit: 500 }, signal }),
  });

  const deals = dealsQ.data ?? [];
  const byStage = stats.data?.byStage ?? [];
  const byFamily = stats.data?.byFamily ?? [];
  // Columns come from the stats stage breakdown; fall back to distinct stages
  // present on the deals if stats haven't loaded.
  const stageIds: string[] =
    byStage.length > 0
      ? byStage.map((s) => s.stage ?? "unknown")
      : Array.from(new Set(deals.map((d) => d.stage ?? "unknown")));
  const totalDeals = deals.length;
  const totalAmount = deals.reduce((sum, d) => sum + num(d.amount), 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-900">Site Level Financial</h1>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">View only - synced from SLF</span>
          <button
            type="button"
            onClick={() => {
              void stats.refetch();
              void dealsQ.refetch();
            }}
            className="ml-auto rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="rounded-lg border border-slate-200 px-4 py-2">
            <div className="text-xs text-slate-500">Deals</div>
            <div className="text-xl font-semibold text-slate-900">{totalDeals}</div>
          </div>
          <div className="rounded-lg border border-slate-200 px-4 py-2">
            <div className="text-xs text-slate-500">Total requested</div>
            <div className="text-xl font-semibold text-slate-900">{money(totalAmount)}</div>
          </div>
          {byFamily.map((f) => (
            <div key={f.product_family ?? "unknown"} className="rounded-lg border border-slate-200 px-4 py-2">
              <div className="text-xs text-slate-500">{titleCase(f.product_family)}</div>
              <div className="text-xl font-semibold text-slate-900">{num(f.n)}</div>
            </div>
          ))}
        </div>
      </div>

      {dealsQ.isLoading ? (
        <p className="px-6 py-8 text-sm text-slate-500">Loading deals...</p>
      ) : dealsQ.error ? (
        <p className="px-6 py-8 text-sm text-red-600">Couldn't reach the SLF service.</p>
      ) : stageIds.length === 0 ? (
        <p className="px-6 py-8 text-sm text-slate-500">No SLF deals synced yet.</p>
      ) : (
        <div className="flex flex-1 gap-3 overflow-x-auto px-6 py-4">
          {stageIds.map((stage) => {
            const cards = deals.filter((d) => (d.stage ?? "unknown") === stage);
            return (
              <div key={stage} className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-50">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold text-slate-700">{titleCase(stage)}</span>
                  <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600">{cards.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                  {cards.map((d) => (
                    <button
                      key={String(d.id)}
                      type="button"
                      onClick={() => setSelectedId(String(d.id))}
                      className="w-full rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-slate-300"
                    >
                      <div className="truncate text-sm font-medium text-slate-900">{d.company_name ?? "-"}</div>
                      <div className="truncate text-xs text-slate-500">{fullName(d) || d.email || ""}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">{money(d.amount)}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          {titleCase(d.product_family)}
                        </span>
                      </div>
                      {d.lender_name ? (
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {d.lender_name}
                          {d.offer_status ? ` - ${titleCase(d.offer_status)}` : ""}
                        </div>
                      ) : null}
                    </button>
                  ))}
                  {cards.length === 0 ? <p className="px-1 py-2 text-xs text-slate-400">Empty</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DealDrawer id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
