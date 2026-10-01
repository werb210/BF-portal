// BF_PORTAL_GOOGLE_HEALTH_v704
// Live Google Ads / Analytics checks from BF-Server (/api/_int/google-health). Each row is what
// Google itself answered; the server also re-runs these hourly and texts/emails on a failure.
import { useCallback, useEffect, useState } from "react";
import api from "@/api";
import Button from "@/components/ui/Button";
import { getAuthToken } from "@/lib/authToken";

type GoogleCheck = { key: string; label: string; status: "ok" | "fail" | "off"; detail: string };
type GoogleReport = { checkedAt: string; checks: GoogleCheck[] };

const COLOR: Record<GoogleCheck["status"], string> = { ok: "green", fail: "red", off: "yellow" };
const WORD: Record<GoogleCheck["status"], string> = { ok: "OK", fail: "FAILED", off: "Off" };

export default function GoogleHealthPanel(): JSX.Element {
  const [report, setReport] = useState<GoogleReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const token = getAuthToken();
      const r = await api.get<GoogleReport>(`/api/_int/google-health${refresh ? "?refresh=1" : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setReport(r as GoogleReport);
    } catch {
      setError("Could not run the Google checks. The server did not answer.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(false); }, [load]);

  return (
    <div data-testid="google-health" style={{ marginTop: 24 }}>
      <h3 style={{ margin: "0 0 4px" }}>Google Ads &amp; Analytics</h3>
      <p style={{ margin: "0 0 12px" }}>Live checks against Google. Re-run every hour; a failure texts and emails Todd and Andrew.</p>
      {error && <p role="alert" style={{ color: "#991b1b", fontWeight: 600 }}>{error}</p>}
      {!report && !error && <p>Checking Google...</p>}
      {report && (
        <div className="runtime-status">
          {report.checks.map((c) => (
            <div className="runtime-status__row" key={c.key} data-check={c.key}>
              <span className="runtime-status__label">
                {c.label}
                <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 400 }}>{c.detail}</span>
              </span>
              <span className={`runtime-status__indicator runtime-status__indicator--${COLOR[c.status]}`}>{WORD[c.status]}</span>
            </div>
          ))}
        </div>
      )}
      <div className="settings-actions">
        <Button type="button" variant="secondary" onClick={() => void load(true)} disabled={busy}>
          {busy ? "Checking Google..." : "Run Google checks now"}
        </Button>
        {report && <span className="runtime-status__timestamp">Google checked at {new Date(report.checkedAt).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
