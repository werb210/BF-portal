// BF_PORTAL_v853_KS_PHONE_SUPPORT - "Start sales demo" (Admins only): asks KS-Ops for a fresh presenter link and opens
// the Keystone presenter demo (KS-Portal /demo/present#p=...) in a new tab.
//   1. the KS-Ops staff token: POST {VITE_KS_OPS_URL}/api/ops/auth/exchange { bfToken } (ensureKsToken in ksApi.ts;
//      BF Admins only, and only OPS_ADMIN_EMAILS when KS-Ops has that list)
//   2. POST {VITE_KS_OPS_URL}/api/ops/demo/presenter-link (Bearer staff token) -> { url, token, expires_at } (12 hours)
//   3. open url in a new tab
// VITE_KS_OPS_URL defaults to https://ks-ops-dev.azurewebsites.net (ksOpsBaseUrl). A failure is shown next to the button.
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { KS_ACCENT } from "./ksAccess";
import { isKsAccessDenied, ksOpsBaseUrl, KsOpsError, ksRequest } from "./ksApi";

export type PresenterLink = { url: string; token?: string; expires_at?: string };

/** One presenter link from KS-Ops (exchanging the BF token first when needed). */
export async function fetchPresenterLink(): Promise<PresenterLink> {
  const r = await ksRequest<PresenterLink>("/api/ops/demo/presenter-link", { method: "POST", body: {} });
  if (!r || typeof r.url !== "string" || !/^https?:\/\//i.test(r.url)) {
    throw new KsOpsError(502, "bad_presenter_link", "Keystone operations did not return a demo link.");
  }
  return r;
}

export function presenterErrorText(err: unknown): string {
  if (isKsAccessDenied(err)) return "Your account may not start the Keystone demo (Keystone operations lets in Admins on its allowed list only).";
  if (err instanceof KsOpsError && err.status === 0) return `Could not reach Keystone operations (${ksOpsBaseUrl()}).`;
  if (err instanceof Error && err.message) return `Could not start the demo: ${err.message}`;
  return "Could not start the demo.";
}

export default function StartDemoButton({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (String((user as { role?: string } | null)?.role ?? "").toLowerCase() !== "admin") return null;

  const start = async () => {
    setError(null);
    setBusy(true);
    // Open the tab now, while the click still counts as a user action (pop-up blockers), then point it at the link.
    let tab: Window | null = null;
    try {
      tab = window.open("", "_blank");
    } catch {
      tab = null;
    }
    try {
      const link = await fetchPresenterLink();
      if (tab && !tab.closed) {
        try { tab.opener = null; } catch { /* some browsers do not allow it */ }
        tab.location.href = link.url;
      } else {
        window.open(link.url, "_blank", "noopener");
      }
    } catch (err) {
      try { tab?.close(); } catch { /* already gone */ }
      setError(presenterErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        data-testid="ks-start-demo"
        style={{
          minHeight: compact ? 30 : 36,
          padding: compact ? "4px 12px" : "6px 14px",
          borderRadius: 8,
          border: "1px solid transparent",
          background: KS_ACCENT,
          color: "#ffffff",
          fontSize: compact ? 13 : 14,
          fontWeight: 600,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.7 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {busy ? "Starting demo..." : "Start sales demo"}
      </button>
      {error ? <span role="alert" style={{ color: "var(--ui-text-danger)", fontSize: 13 }}>{error}</span> : null}
    </span>
  );
}
