// BF_PORTAL_v875_SSO (ported from KS-Portal SsoSettings, Microsoft only, plan gate removed) - Settings > Microsoft
// sign-in (Admins). One switch for all of Boreal: show "Sign in with Microsoft" on the staff sign-in page. Staff are
// matched to their existing staff account by email (nobody is added); the text-code and passkey sign-ins keep working;
// a Microsoft sign-in counts as a strong sign-in for "require a passkey or two-step sign-in" (Settings > Security).
import { useEffect, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";

export type MicrosoftStatus = {
  configured: boolean; enabled: boolean; available: boolean; client_id: string; tenant_id: string; redirect_uri: string; return_url: string;
};
export type SsoSettingsBody = { settings: { microsoft_enabled: boolean }; microsoft: MicrosoftStatus };

export const SSO_SETTINGS_KEY = ["settings", "sso"] as const;

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16, maxWidth: 760 };
const h3: CSSProperties = { margin: "0 0 8px", fontSize: 16, color: "var(--ui-text)" };
const text: CSSProperties = { margin: "0 0 10px", fontSize: 13, lineHeight: 1.5, color: "var(--ui-text)" };
const mono: CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, wordBreak: "break-all" };
const check: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, fontWeight: 600, color: "var(--ui-text)", cursor: "pointer" };
const notice: CSSProperties = { margin: "6px 0 0", padding: "8px 10px", borderRadius: 8, background: "#fef3c7", color: "#78350f", fontSize: 13 };
const errorBox: CSSProperties = { marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "#fee2e2", color: "#7f1d1d", fontSize: 13 };
const okBox: CSSProperties = { marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "#dcfce7", color: "#14532d", fontSize: 13 };
const quiet: CSSProperties = { padding: "5px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 12, fontWeight: 600, cursor: "pointer" };

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message && e.message !== "API_ERROR" ? e.message : fallback);

export default function MicrosoftSignInSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: SSO_SETTINGS_KEY, queryFn: () => api.get<SsoSettingsBody>("/api/sso-settings") });
  const [ok, setOk] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => { if (q.data?.settings) setOn(q.data.settings.microsoft_enabled); }, [q.data]);

  const save = useMutation({
    mutationFn: (microsoft_enabled: boolean) => api.put<SsoSettingsBody>("/api/sso-settings", { microsoft_enabled }),
    onSuccess: (body, enabled) => {
      qc.setQueryData(SSO_SETTINGS_KEY, body);
      setOk(enabled ? "Sign in with Microsoft is on." : "Sign in with Microsoft is off.");
    },
    onError: () => { if (q.data?.settings) setOn(q.data.settings.microsoft_enabled); },
  });

  if (q.isLoading) return <p style={text}>Loading Microsoft sign-in…</p>;
  if (q.isError || !q.data) return <p style={errorBox} role="alert">{errText(q.error, "Could not load the Microsoft sign-in settings.")}</p>;
  const ms = q.data.microsoft;
  const copy = async () => {
    try { await navigator.clipboard.writeText(ms.redirect_uri); setCopied(true); } catch { setCopied(false); }
  };

  return (
    <div data-testid="sso-settings">
      <section style={card} aria-labelledby="sso-h">
        <h3 id="sso-h" style={h3}>Sign in with Microsoft</h3>
        <p style={text}>
          Lets staff sign in to the portal with their Boreal Microsoft 365 account. They are matched to their existing staff account by
          email: nobody new is added, lender and referrer accounts can&rsquo;t use it, and switched-off staff can&rsquo;t sign in. Only
          accounts from Boreal&rsquo;s own Microsoft directory are accepted. Text codes and passkeys keep working. A Microsoft sign-in
          counts as a strong sign-in for &ldquo;require a passkey or two-step sign-in&rdquo; in Settings &gt; Security. Every Microsoft
          sign-in, and every refused one, is recorded in the audit log. This applies to every silo.
        </p>
        <label style={check}>
          <input
            type="checkbox"
            checked={on}
            disabled={(!ms.configured && !on) || save.isPending}
            onChange={(e) => { setOk(null); setOn(e.target.checked); save.mutate(e.target.checked); }}
            style={{ marginTop: 3 }}
          />
          <span>Show &ldquo;Sign in with Microsoft&rdquo; on the staff sign-in page</span>
        </label>
        {!ms.configured ? (
          <p style={notice}>The server doesn&rsquo;t have the Microsoft app&rsquo;s client secret yet (MSAL_CLIENT_SECRET on the server). Add it, then turn this on.</p>
        ) : null}
        <p style={{ ...text, marginTop: 10, color: "var(--ui-text-muted)" }}>Not shown in the iPad app, where staff sign in with a text code or passkey.</p>
        {save.isError ? <p style={errorBox} role="alert">{errText(save.error, "Could not save.")}</p> : null}
        {ok ? <p style={okBox} role="status">{ok}</p> : null}
      </section>
      <section style={card} aria-labelledby="sso-setup-h">
        <h3 id="sso-setup-h" style={h3}>Microsoft app set-up</h3>
        <p style={text}>
          In the Microsoft Entra admin centre, open the app <span style={mono}>{ms.client_id}</span> (directory{" "}
          <span style={mono}>{ms.tenant_id}</span>), go to Authentication, and under the <strong>Web</strong> platform add this
          redirect address:
        </p>
        <p style={{ ...text, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={mono} data-testid="sso-redirect-uri">{ms.redirect_uri}</span>
          <button type="button" style={quiet} onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</button>
        </p>
        <p style={{ ...text, color: "var(--ui-text-muted)" }}>After signing in, staff come back to <span style={mono}>{ms.return_url}</span>.</p>
      </section>
    </div>
  );
}
