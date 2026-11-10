// BF_PORTAL_v937_SOCIAL_POSTING - Marketing > Social: connect the business's social accounts, write one post and publish
// it now or schedule it to any of them, and see how each one went.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, rawApiFetch } from "@/api";

type NetworkInfo = { key: string; label: string; provider: string; configured: boolean; settings: string[] };
type Account = { id: string; network: string; name: string; status: string; last_error: string | null };
type Result = { ok: boolean; network?: string; name?: string; url?: string | null; error?: string };
type Post = { id: string; body: string; link_url: string | null; image_url: string | null; account_ids: string[]; scheduled_at: string | null; status: string; results: Record<string, Result>; created_at: string; published_at: string | null };

const STATUS: Record<string, string> = { scheduled: "Scheduled", publishing: "Posting…", published: "Posted", partial: "Posted to some", failed: "Not posted", cancelled: "Cancelled" };
const PROVIDER_LABEL: Record<string, string> = { meta: "Facebook and Instagram", threads: "Threads", linkedin: "LinkedIn", x: "X", google: "Google Business Profile", bluesky: "Bluesky" };
const LIMIT: Record<string, number> = { x: 280, bluesky: 300 };

function errText(e: unknown, fallback: string): string { return e instanceof Error && e.message && e.message !== "API_ERROR" ? e.message : fallback; }

export default function SocialPanel() {
  const [networks, setNetworks] = useState<NetworkInfo[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("social") === "connected") return { ok: true, text: "Connected." };
    if (q.get("social") === "error") return { ok: false, text: `The connection didn't finish. ${q.get("why") ?? ""}`.trim() };
    return null;
  });
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [bsky, setBsky] = useState({ handle: "", pw: "", open: false });

  const load = useCallback(async () => {
    try {
      const a = await api.get<{ networks: NetworkInfo[]; accounts: Account[]; ready: boolean }>("/api/social/accounts");
      setNetworks(a?.networks ?? []); setAccounts(a?.accounts ?? []); setReady(a?.ready !== false);
      const p = await api.get<{ posts: Post[] }>("/api/social/posts");
      setPosts(p?.posts ?? []);
    } catch (e) { setNote({ ok: false, text: errText(e, "Could not load social accounts.") }); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  // Review fix: while a post is scheduled or going out, check again every 30 seconds so its result shows here.
  const waiting = posts.some((p) => p.status === "scheduled" || p.status === "publishing");
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(t);
  }, [waiting, load]);

  const providers = useMemo(() => {
    const seen = new Map<string, boolean>();
    for (const n of networks) seen.set(n.provider, n.configured);
    return [...seen.entries()];
  }, [networks]);
  const nameOf = (id: string) => { const a = accounts.find((x) => x.id === id); return a ? `${networks.find((n) => n.key === a.network)?.label ?? a.network} ${a.name}` : "Removed account"; };
  const pickedAccounts = accounts.filter((a) => picked.has(a.id));
  const tooLong = pickedAccounts.filter((a) => { const max = LIMIT[a.network]; return Boolean(max) && body.length + (link ? link.length + 2 : 0) > (max ?? 0); });
  const needsPicture = pickedAccounts.some((a) => a.network === "instagram") && !image;

  const connect = async (provider: string) => {
    if (provider === "bluesky") { setBsky((b) => ({ ...b, open: true })); return; }
    try { const r = await api.post<{ url: string }>(`/api/social/connect/${provider}`, {}); if (r?.url) window.location.assign(r.url); }
    catch (e) { setNote({ ok: false, text: errText(e, "Could not start the connection.") }); }
  };
  const connectBluesky = async () => {
    setBusy(true);
    try { await api.post("/api/social/connect/bluesky", { handle: bsky.handle, appPassword: bsky.pw }); setBsky({ handle: "", pw: "", open: false }); setNote({ ok: true, text: "Bluesky connected." }); await load(); }
    catch (e) { setNote({ ok: false, text: errText(e, "Bluesky did not connect.") }); }
    finally { setBusy(false); }
  };
  const disconnect = async (a: Account) => {
    try { await api.delete(`/api/social/accounts/${a.id}`); setPicked((s) => { const n = new Set(s); n.delete(a.id); return n; }); await load(); }
    catch (e) { setNote({ ok: false, text: errText(e, "Could not disconnect.") }); }
  };
  const uploadPicture = async (f: File) => {
    const fd = new FormData(); fd.append("file", f);
    setBusy(true);
    try {
      const res = await rawApiFetch("/api/social/media", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { url?: string; preview?: string; message?: string };
      if (!res.ok || !j.url) throw new Error(j.message ?? "The picture did not upload.");
      setImage(j.url); setPreview(j.preview ?? (j.url.startsWith("http") ? j.url : ""));
    } catch (e) { setNote({ ok: false, text: errText(e, "The picture did not upload.") }); }
    finally { setBusy(false); }
  };
  const send = async () => {
    setBusy(true); setNote(null);
    try {
      const r = await api.post<{ post: Post }>("/api/social/posts", { body, link_url: link || null, image_url: image || null, account_ids: [...picked], scheduled_at: when ? new Date(when).toISOString() : null });
      const p = r?.post;
      if (p?.status === "scheduled") setNote({ ok: true, text: `Scheduled for ${new Date(p.scheduled_at!).toLocaleString()}.` });
      else if (p?.status === "published") setNote({ ok: true, text: "Posted to every account." });
      else setNote({ ok: false, text: "Some accounts did not take it. See the list below." });
      setBody(""); setLink(""); setImage(""); setPreview(""); setWhen("");
      await load();
    } catch (e) { setNote({ ok: false, text: errText(e, "The post did not go out.") }); }
    finally { setBusy(false); }
  };
  const cancel = async (p: Post) => { try { await api.delete(`/api/social/posts/${p.id}`); await load(); } catch (e) { setNote({ ok: false, text: errText(e, "Could not cancel.") }); } };

  return (
    <div data-testid="social-panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {note ? <div role={note.ok ? "status" : "alert"} style={{ padding: 10, borderRadius: 8, border: `1px solid ${note.ok ? "#86efac" : "#fca5a5"}`, background: note.ok ? "#f0fdf4" : "#fef2f2", color: note.ok ? "#14532d" : "#7f1d1d" }}>{note.text}</div> : null}
      {!ready ? <div role="alert" style={{ color: "var(--ui-text)" }}>Social posting is not switched on for the server yet.</div> : null}

      <section className="ui-card" style={{ padding: 16 }}>
        <h3 style={{ margin: "0 0 8px" }}>Your accounts</h3>
        {accounts.length === 0 ? <p style={{ color: "var(--ui-text-muted)", margin: "0 0 8px" }}>No accounts connected yet.</p> : (
          <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {accounts.map((a) => (
              <li key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", flex: 1, minWidth: 220 }}>
                  <input type="checkbox" checked={picked.has(a.id)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(a.id); else n.delete(a.id); return n; })} />
                  <strong>{networks.find((n) => n.key === a.network)?.label ?? a.network}</strong> {a.name}
                </label>
                {a.status === "needs_reconnect" ? <span style={{ color: "#b45309", fontSize: 13 }}>Connect again{a.last_error ? `: ${a.last_error}` : ""}</span> : null}
                <button type="button" className="ui-button ui-button--secondary" onClick={() => void disconnect(a)}>Disconnect</button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {providers.map(([p, configured]) => (
            <button key={p} type="button" className="ui-button ui-button--secondary" disabled={!configured || !ready} title={configured ? undefined : "Not set up on the server yet"} onClick={() => void connect(p)} data-testid={`connect-${p}`}>
              Connect {PROVIDER_LABEL[p] ?? p}{configured ? "" : " (not set up yet)"}
            </button>
          ))}
        </div>
        {bsky.open ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>Bluesky handle<input value={bsky.handle} onChange={(e) => setBsky((b) => ({ ...b, handle: e.target.value }))} placeholder="yourname.bsky.social" /></label>
            <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>App password<input type="password" value={bsky.pw} onChange={(e) => setBsky((b) => ({ ...b, pw: e.target.value }))} /></label>
            <button type="button" className="ui-button ui-button--primary" disabled={busy || !bsky.handle || !bsky.pw} onClick={() => void connectBluesky()}>Connect</button>
            <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Make an app password in Bluesky: Settings &gt; Privacy and security &gt; App passwords.</span>
          </div>
        ) : null}
      </section>

      <section className="ui-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ margin: 0 }}>New post</h3>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>Post
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} data-testid="social-body" />
        </label>
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{body.length} characters</span>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>Link (optional)<input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label className="ui-button ui-button--secondary" style={{ cursor: "pointer" }}>{image ? "Change picture" : "Add a picture"}
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPicture(f); }} />
          </label>
          {image ? <>{preview ? <img src={preview} alt="" style={{ height: 48, borderRadius: 6 }} /> : <span style={{ fontSize: 13 }}>Picture added</span>}<button type="button" className="ui-button ui-button--secondary" onClick={() => { setImage(""); setPreview(""); }}>Remove picture</button></> : null}
        </div>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 13, maxWidth: 260 }}>Schedule (leave empty to post now)
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        {tooLong.length ? <p role="alert" style={{ margin: 0, color: "#b45309", fontSize: 13 }}>Too long for {tooLong.map((a) => networks.find((n) => n.key === a.network)?.label).join(" and ")}: it will be cut off there.</p> : null}
        {needsPicture ? <p role="alert" style={{ margin: 0, color: "#b45309", fontSize: 13 }}>Instagram needs a picture.</p> : null}
        <div>
          <button type="button" className="ui-button ui-button--primary" data-testid="social-send" disabled={busy || !body.trim() || picked.size === 0 || needsPicture} onClick={() => void send()}>
            {busy ? "Working…" : when ? `Schedule to ${picked.size} account${picked.size === 1 ? "" : "s"}` : `Post to ${picked.size} account${picked.size === 1 ? "" : "s"}`}
          </button>
          {picked.size === 0 ? <span style={{ marginLeft: 10, fontSize: 13, color: "var(--ui-text-muted)" }}>Tick the accounts to post to above.</span> : null}
        </div>
      </section>

      <section className="ui-card" style={{ padding: 16 }}>
        <h3 style={{ margin: "0 0 8px" }}>Posts</h3>
        {posts.length === 0 ? <p style={{ color: "var(--ui-text-muted)", margin: 0 }}>Nothing posted yet.</p> : posts.map((p) => (
          <div key={p.id} style={{ borderTop: "1px solid var(--ui-border)", padding: "10px 0" }} data-testid={`social-post-${p.id}`}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <strong>{STATUS[p.status] ?? p.status}</strong>
              <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{new Date(p.scheduled_at ?? p.published_at ?? p.created_at).toLocaleString()}</span>
              {p.status === "scheduled" ? <button type="button" className="ui-button ui-button--secondary" onClick={() => void cancel(p)}>Cancel</button> : null}
            </div>
            <div style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>{p.body}</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {p.account_ids.map((id) => {
                const r = p.results?.[id];
                return (
                  <li key={id}>
                    {nameOf(id)}: {!r ? (p.status === "scheduled" ? "waiting" : "…") : r.ok ? (r.url ? <a href={r.url} target="_blank" rel="noreferrer">posted</a> : "posted") : <span style={{ color: "#b91c1c" }}>{r.error}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
