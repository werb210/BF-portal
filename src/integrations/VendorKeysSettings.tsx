// BF_PORTAL_v898_YOUR_SERVICES - Settings > Risk and ID checks > Your services (Admins): Boreal's own accounts with paid verification
// services, pasted here instead of Azure. Saved keys are
// never shown again - only that they are set and their last 4 characters.
import { useEffect, useState, type CSSProperties } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";

type KeyView = { key: string; label: string; service: string; secret: boolean; hint?: string; set: boolean; preview: string | null; in_azure?: boolean };
type Service = { id: string; name: string; signup: string; what: string };
type View = { services: Service[]; keys: KeyView[]; onfido_webhook_url: string; can_save: boolean };

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const muted: CSSProperties = { fontSize: 13, color: "var(--ui-text-muted)", margin: "4px 0 0" };
const input: CSSProperties = { width: "100%", maxWidth: 420, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 14 };
const btn: CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-accent-blue, #2563eb)", color: "#fff", fontWeight: 600, cursor: "pointer" };
const quiet: CSSProperties = { ...btn, background: "var(--ui-surface)", color: "var(--ui-text)" };
const code: CSSProperties = { fontFamily: "ui-monospace, monospace", fontSize: 12, padding: "2px 6px", borderRadius: 6, background: "var(--ui-surface)", border: "1px solid var(--ui-border)", color: "var(--ui-text)", wordBreak: "break-all" };

export const ERROR_TEXT: Record<string, string> = {
  no_encryption_key: "Keys cannot be saved on this server yet. Contact the person who manages the server.",
  bad_region: "The region must be ca, us or eu.",
  set_in_azure: "That value is set in Azure, so it cannot be changed here.",
};

export default function VendorKeysSettings() {
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api.get<View>("/api/vendor-keys").then(setView).catch((e) => setErr(e instanceof Error ? e.message : "Could not load your services."));
  }, []);

  if (err) return <p role="alert" style={{ color: "#b91c1c" }}>{err}</p>;
  if (!view) return <p style={muted}>Loading…</p>;

  const save = async (service: string, values: Record<string, string | null>) => {
    setBusy(service);
    try {
      const r = await api.put<{ ok: boolean; keys: KeyView[] }>("/api/vendor-keys", { values });
      setView({ ...view, keys: r.keys });
      setDraft((d) => { const n = { ...d }; for (const k of Object.keys(values)) delete n[k]; return n; });
      toast.success("Saved");
    } catch (e) {
      const code = String(((e as { details?: { error?: unknown } })?.details?.error) ?? (e as { code?: string })?.code ?? "");
      toast.error(ERROR_TEXT[code] ?? "Could not save. Check the values and try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-testid="vendor-keys-settings">
      <h2 style={{ margin: "0 0 4px" }}>Your services</h2>
      <p style={{ ...muted, marginBottom: 16 }}>
        Use your own accounts with these verification services. Sign up with the service, paste your keys here, and Boreal uses them straight away. Saved keys are never shown again. A value already set in Azure is used instead and cannot be changed here.
      </p>
      {!view.can_save && <p role="alert" style={{ color: "#b45309", marginBottom: 12 }}>{ERROR_TEXT.no_encryption_key}</p>}
      {view.services.map((s) => {
        const keys = view.keys.filter((k) => k.service === s.id);
        const allSet = keys.every((k) => k.set || k.key === "ONFIDO_REGION");
        const changes = Object.fromEntries(keys.filter((k) => (draft[k.key] ?? "").trim()).map((k) => [k.key, draft[k.key]!.trim()]));
        return (
          <section key={s.id} style={card} data-testid={`vendor-${s.id}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{s.name}</h3>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: allSet ? "#dcfce7" : "#f3f4f6", color: allSet ? "#166534" : "#374151" }}>
                {allSet ? "Set up" : "Not set up"}
              </span>
            </div>
            <p style={muted}>{s.what}</p>
            <p style={muted}><a href={s.signup} target="_blank" rel="noreferrer" style={{ color: "var(--ui-accent-fg, #1d4ed8)" }}>Sign up with this service</a></p>
            {s.id === "id" && (
              <p style={muted}>In the service's dashboard, add this webhook address: <span style={code}>{view.onfido_webhook_url}</span></p>
            )}
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {keys.map((k) => (
                <label key={k.key} style={{ display: "grid", gap: 4, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{k.label}{k.set ? <span style={{ fontWeight: 400, color: "var(--ui-text-muted)" }}> - {k.in_azure ? "set in Azure" : "saved"} {k.preview}</span> : null}</span>
                  <input
                    aria-label={k.label}
                    type={k.secret ? "password" : "text"}
                    autoComplete="off"
                    placeholder={k.set ? "Paste a new value to replace it" : k.hint ?? "Paste the value"}
                    value={draft[k.key] ?? ""}
                    disabled={Boolean(k.in_azure)}
                    onChange={(e) => setDraft((d) => ({ ...d, [k.key]: e.target.value }))}
                    style={input}
                  />
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" style={btn} disabled={busy === s.id || Object.keys(changes).length === 0 || !view.can_save} onClick={() => void save(s.id, changes)}>
                {busy === s.id ? "Saving…" : "Save"}
              </button>
              {keys.some((k) => k.set && !k.in_azure) && (
                <button type="button" style={quiet} disabled={busy === s.id} onClick={() => void save(s.id, Object.fromEntries(keys.filter((k) => !k.in_azure).map((k) => [k.key, null])))}>
                  Remove
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
