// BF_PORTAL_v872_KYC - Settings > ID verification (Admins): which service runs the checks (automatic, the vendor, or
// manual review), whether the client app asks for ID right after an application is submitted, which vendor settings
// are in place, and the webhook address to give the vendor.
import { useEffect, useState, type CSSProperties } from "react";
import toast from "react-hot-toast";
import { kycApi, type KycSettingsView } from "@/kyc/kycApi";

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16 };
const muted: CSSProperties = { fontSize: 13, color: "var(--ui-text-muted)", margin: "4px 0 0" };
const input: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13 };
const code: CSSProperties = { fontFamily: "ui-monospace, monospace", fontSize: 12, padding: "2px 6px", borderRadius: 6, background: "var(--ui-surface)", border: "1px solid var(--ui-border)", color: "var(--ui-text)", wordBreak: "break-all" };

export default function IdVerificationSettings() {
  const [view, setView] = useState<KycSettingsView | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    kycApi.settings().then(setView).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the settings."));
  }, []);
  if (err) return <p role="alert" style={{ color: "#b91c1c" }}>{err}</p>;
  if (!view) return <p style={muted}>Loading…</p>;

  const save = async (patch: Parameters<typeof kycApi.saveSettings>[0]) => {
    try {
      const r = await kycApi.saveSettings(patch);
      setView((v) => (v ? { ...v, settings: r.settings } : v));
      try { toast.success("Saved."); } catch { /* no toaster */ }
    } catch (e) {
      try { toast.error(e instanceof Error ? e.message : "Could not save."); } catch { /* no toaster */ }
    }
  };
  const onfido = view.providers.find((p) => p.key === "onfido");

  return (
    <div data-testid="kyc-settings">
      <section style={card}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>ID verification</h3>
        <p style={muted}>Applicants and guarantors prove who they are with a photo of their government ID and a selfie. Canada and the US. What the service reads from the ID is stored encrypted, and the pictures are saved to the file's Documents (retention and legal holds apply).</p>
        <label style={{ display: "block", marginTop: 12, fontSize: 14 }}>
          Service{" "}
          <select aria-label="Verification service" value={view.settings.provider ?? "auto"} onChange={(e) => void save({ provider: e.target.value as "auto" | "onfido" | "manual" })} style={input}>
            <option value="auto">Automatic (the ID-check service when it is set up, otherwise manual review)</option>
            <option value="onfido">ID-check service (Entrust IDV)</option>
            <option value="manual">Manual review (client uploads ID and a selfie; your staff decide)</option>
          </select>
        </label>
        <p style={muted}>In use now: <strong>{view.providers.find((p) => p.key === view.active_provider)?.label}</strong></p>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 14 }}>
          <input type="checkbox" checked={view.settings.wizard_step} onChange={(e) => void save({ wizard_step: e.target.checked })} />
          Ask for ID right after the client submits an application
        </label>
        {view.settings.wizard_step ? (
          <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
            Who{" "}
            <select aria-label="Who to verify" value={view.settings.wizard_people} onChange={(e) => void save({ wizard_people: e.target.value as "applicant" | "applicant_and_guarantors" })} style={input}>
              <option value="applicant">The applicant</option>
              <option value="applicant_and_guarantors">The applicant and every guarantor on the file</option>
            </select>
          </label>
        ) : null}
      </section>
      {onfido ? (
        <section style={card}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>ID-check service connection</h3>
          <p style={muted}>Status: <strong style={{ color: onfido.configured ? "#15803d" : "#b45309" }}>{onfido.configured ? "Set up" : "Not set up"}</strong></p>
          <p style={muted}>Server settings it needs: {onfido.settings.join(", ")}.</p>
          <p style={muted}>Webhook address to enter in the service's dashboard (event: workflow run completed):</p>
          <p><span style={code} data-testid="kyc-webhook-url">{view.webhook_url}</span></p>
        </section>
      ) : null}
    </div>
  );
}
