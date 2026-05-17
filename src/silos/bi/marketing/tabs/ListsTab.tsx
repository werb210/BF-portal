// BF_PORTAL_BLOCK_BI_ROUND8_MARKETING_UI_v1
import { useEffect, useState } from "react";
import { api } from "@/api";
import toast from "react-hot-toast";

type ListRow = {
  id: string;
  name: string;
  filter_spec: Record<string, unknown>;
  updated_at: string;
};

type PreviewContact = { id: string; full_name: string; email: string | null };

const DEFAULT_SPEC = '{\n  "has_email": true,\n  "lifecycle_stage": "lead"\n}';

type ApolloList = { id: string; name: string; count: number | null; updated_at: string | null };
type ImportResult = { ok: boolean; upserted: number; created: number; errors: number; elapsed_ms: number };

function ApolloImportPanel() {
  const [lists, setLists] = useState<ApolloList[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ImportResult>>({});

  const loadLists = async () => {
    setError(null);
    try {
      const r = await api<{ lists?: ApolloList[] }>("/api/v1/bi/admin/apollo/lists");
      setLists(Array.isArray(r.lists) ? r.lists : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Apollo lists");
      setLists([]);
    }
  };
  useEffect(() => { void loadLists(); }, []);

  const importList = async (id: string, name: string) => {
    setBusyId(id);
    const t = toast.loading("Importing " + name);
    try {
      const r = await api<ImportResult>("/api/v1/bi/admin/apollo/lists/" + encodeURIComponent(id) + "/import", { method: "POST" });
      setResults((prev) => ({ ...prev, [id]: r }));
      toast.success("Imported " + r.upserted + " contacts (" + r.created + " new)", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed", { id: t });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-brand-bgAlt border border-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Import from Apollo</h3>
        <button onClick={() => void loadLists()} className="text-xs text-blue-300 hover:text-blue-200">Refresh</button>
      </div>
      <p className="text-[11px] text-white/50">Saved lists from your Apollo account. Import pulls contacts into BI CRM.</p>
      {error && <div className="text-xs text-red-300">{error}</div>}
      {lists === null && <div className="text-xs text-white/40 italic">Loading</div>}
      {lists !== null && lists.length === 0 && !error && <div className="text-xs text-white/40 italic">No Apollo lists found.</div>}
      {lists !== null && lists.length > 0 && (
        <ul className="space-y-1.5">
          {lists.map((l) => {
            const r = results[l.id];
            const isBusy = busyId === l.id;
            return (
              <li key={l.id} className="flex items-center justify-between gap-2 bg-brand-surface border border-card rounded px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{l.name}</div>
                  <div className="text-[10px] text-white/40">
                    {l.count != null ? l.count + " members" : "count unavailable"}
                    {r && <span className="ml-2 text-emerald-300">imported {r.upserted}</span>}
                  </div>
                </div>
                <button
                  onClick={() => void importList(l.id, l.name)}
                  disabled={isBusy}
                  className="rounded bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-40 px-3 py-1 text-xs text-blue-200 whitespace-nowrap"
                >
                  {isBusy ? "Importing" : r ? "Re-import" : "Import to CRM"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ListsTab() {
  const [list, setList] = useState<ListRow[]>([]);
  const [name, setName] = useState("");
  const [spec, setSpec] = useState(DEFAULT_SPEC);
  const [preview, setPreview] = useState<PreviewContact[] | null>(null);

  const load = async () => {
    try {
      const r = await api<{ lists: ListRow[] }>("/api/v1/bi/marketing/lists");
      setList(r.lists || []);
    } catch {
      setList([]);
    }
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!name.trim()) { alert("Name required"); return; }
    let parsed: unknown;
    try { parsed = JSON.parse(spec); }
    catch { alert("Filter spec must be valid JSON"); return; }
    try {
      await api("/api/v1/bi/marketing/lists", { method: "POST", body: JSON.stringify({ name, filter_spec: parsed }) });
      setName(""); setSpec("{}");
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    }
  };

  const previewList = async (id: string) => {
    try {
      const r = await api<{ contacts: PreviewContact[] }>(`/api/v1/bi/marketing/lists/${id}/contacts`);
      setPreview(r.contacts || []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Preview failed");
    }
  };

  return (
    <div className="space-y-4">
      <ApolloImportPanel />
      <h3 className="text-lg font-medium">Lists / Segments</h3>
      <div className="bg-brand-bgAlt border border-card rounded-xl p-4 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="List name" className="w-full rounded border border-card bg-brand-surface px-3 py-2 text-sm text-white" />
        <textarea value={spec} onChange={(e) => setSpec(e.target.value)} rows={5} className="w-full rounded border border-card bg-brand-surface px-3 py-2 text-xs font-mono text-white" />
        <p className="text-[11px] text-white/50">Supported keys: has_email, has_phone, lifecycle_stage, tags_any (array)</p>
        <button onClick={() => void create()} className="rounded bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5 text-sm text-blue-200">Create list</button>
      </div>
      <ul className="space-y-2">
        {list.map((l) => (
          <li key={l.id} className="bg-brand-surface border border-card rounded p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{l.name}</div>
              <div className="text-[10px] text-white/40">{Object.keys(l.filter_spec).join(", ") || "no filters"}</div>
            </div>
            <button onClick={() => void previewList(l.id)} className="text-xs text-blue-300 hover:text-blue-200">Preview</button>
          </li>
        ))}
        {list.length === 0 && <li className="text-white/50 italic">No lists yet.</li>}
      </ul>
      {preview && (
        <div className="bg-brand-bgAlt border border-card rounded-xl p-4 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <strong className="text-sm">Preview ({preview.length})</strong>
            <button onClick={() => setPreview(null)} className="text-xs text-white/50 hover:text-white">Close</button>
          </div>
          <ul className="text-xs space-y-1">
            {preview.map((c) => (
              <li key={c.id} className="text-white/80">
                {c.full_name} <span className="text-white/40">{c.email}</span>
              </li>
            ))}
            {preview.length === 0 && <li className="italic text-white/50">No matches.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
