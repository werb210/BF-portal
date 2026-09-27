// BF_PORTAL_BLOCK_v594_SHARE_TO_DEAL
// iPad: Share -> Boreal Portal from Mail, Files or Photos. The file opens this sheet;
// pick the deal and the category and it is uploaded to that application's documents,
// exactly as the Documents tab upload does.
import { useEffect, useMemo, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { api } from "@/api";
import { STAFF_DOC_CATEGORIES, isDuplicateUploadError } from "@/pages/applications/tabs/DocumentsTab";
import { dealCards, isSharedFileUrl, matchDeals, mimeFor, sharedFileName, type DealCard } from "@/native/shareToDeal";

async function readShared(url: string): Promise<File | null> {
  const name = sharedFileName(url);
  try {
    const r = await Filesystem.readFile({ path: url });
    if (typeof r.data !== "string") return new File([r.data], name, { type: mimeFor(name) });
    const bin = atob(r.data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name, { type: mimeFor(name) });
  } catch {
    return null;
  }
}

export default function ShareToDealProvider() {
  const [file, setFile] = useState<File | null>(null);
  const [deals, setDeals] = useState<DealCard[]>([]);
  const [query, setQuery] = useState("");
  const [deal, setDeal] = useState<DealCard | null>(null);
  const [category, setCategory] = useState<string>(STAFF_DOC_CATEGORIES[0] ?? "Other");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const take = async (url: unknown) => {
      if (!isSharedFileUrl(url)) return;
      const f = await readShared(url);
      if (!f) return;
      setFile(f); setDeal(null); setQuery(""); setResult(null);
    };
    void App.getLaunchUrl().then((launch) => take(launch?.url)).catch(() => undefined);
    const handle = App.addListener("appUrlOpen", ({ url }) => void take(url));
    return () => { void handle.then((h) => h.remove()); };
  }, []);

  useEffect(() => {
    if (!file) return;
    api<unknown>("/api/portal/applications", { headers: { "X-Silo": "BF" } })
      .then((r) => setDeals(dealCards(r)))
      .catch(() => setDeals([]));
  }, [file]);

  const shown = useMemo(() => matchDeals(deals, query), [deals, query]);
  if (!file) return null;

  const close = () => { setFile(null); setResult(null); };
  const upload = async () => {
    if (!deal) return;
    setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("applicationId", deal.id);
      fd.append("category", category);
      fd.append("file", file);
      await api("/api/documents/upload", { method: "POST", body: fd });
      setResult({ ok: true, text: `Added ${file.name} to ${deal.title} as ${category}.` });
    } catch (e) {
      setResult(isDuplicateUploadError(e)
        ? { ok: true, text: "This file is already on that deal." }
        : { ok: false, text: "Upload failed. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-label="Add to a deal" className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 text-slate-900 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add to a deal</h2>
          <button type="button" onClick={close} className="text-sm text-slate-500">{result?.ok ? "Done" : "Cancel"}</button>
        </div>
        <p className="mb-3 truncate text-sm text-slate-600">{file.name}</p>
        {deal ? (
          <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm">
            <span className="font-medium">{deal.title}</span>
            <button type="button" className="text-blue-700" onClick={() => setDeal(null)}>Change</button>
          </div>
        ) : (
          <div className="mb-3">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search deals by business name"
              className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <ul className="max-h-60 overflow-y-auto">
              {shown.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => setDeal(d)} className="w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-100">
                    <span className="font-medium">{d.title}</span>
                    {d.stage ? <span className="ml-2 text-xs text-slate-500">{d.stage}</span> : null}
                  </button>
                </li>
              ))}
              {shown.length === 0 ? <li className="px-2 py-2 text-sm text-slate-500">No matching deals.</li> : null}
            </ul>
          </div>
        )}
        <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {STAFF_DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {result ? <p className={`mb-3 text-sm ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.text}</p> : null}
        <button type="button" disabled={!deal || busy || !!result?.ok} onClick={() => void upload()}
          className="w-full rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Uploading..." : "Upload to deal"}
        </button>
      </div>
    </div>
  );
}
