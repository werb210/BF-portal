// BF_PORTAL_v947_BROKERAGE_SETUP - Settings > Brokerage set-up > Email. Shared mailbox signatures belong to the
// brokerage, not to one broker, so the owner sets them here (they used to sit in My Profile).
import { useEffect, useMemo, useState } from "react";
import api from "@/api";
import Button from "@/components/ui/Button";
import SignatureBuilder from "@/components/signature/SignatureBuilder";
import type { SignatureFields } from "@/components/signature/signatureHtml";
import { getErrorMessage } from "@/utils/errors";
import { useSignatureBrand } from "./ProfileSettings";

export default function SharedMailboxSignatures() {
  const [shared, setShared] = useState<Array<{ address: string; display_name: string }>>([]);
  const [address, setAddress] = useState<string>("");
  const [html, setHtml] = useState<string>("");
  const [draft, setDraft] = useState<string>(""); // BF_PORTAL_v864_SIGNATURE_BUILDER
  const brand = useSignatureBrand();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Load the shared mailboxes the staff member can send as.
  useEffect(() => {
    let cancelled = false;
    api.get<{ mine: unknown; shared: Array<{ address: string; display_name: string }> }>("/api/crm/shared-mailboxes")
      .then((r) => {
        if (cancelled) return;
        const list = Array.isArray(r?.shared) ? r.shared : [];
        setShared(list);
        if (list[0]) setAddress(list[0].address);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Load the selected mailbox's signature.
  useEffect(() => {
    if (!address) { setHtml(""); return; }
    let cancelled = false;
    setStatus(null);
    api.get<{ signature_html?: string }>(`/api/crm/shared-mailboxes/${encodeURIComponent(address)}/signature`)
      .then((r) => { if (!cancelled) { setHtml(r?.signature_html ?? ""); setDraft(r?.signature_html ?? ""); } })
      .catch(() => { if (!cancelled) { setHtml(""); setDraft(""); } });
    return () => { cancelled = true; };
  }, [address]);

  // BF_PORTAL_v864_SIGNATURE_BUILDER - a shared mailbox signs as the mailbox: its name and address, the brand.
  const mailbox = shared.find((m) => m.address === address);
  const sharedDefaults = useMemo<Partial<SignatureFields>>(() => ({
    ...brand,
    name: mailbox?.display_name ?? "",
    email: address,
  }), [brand, mailbox?.display_name, address]);

  async function save() {
    if (!address) return;
    setSaving(true); setStatus(null);
    try {
      await api.put(`/api/crm/shared-mailboxes/${encodeURIComponent(address)}/signature`, { signature_html: draft });
      setStatus("Saved.");
    } catch (e) {
      setStatus(getErrorMessage(e, "Save failed."));
    } finally {
      setSaving(false);
    }
  }

  if (loaded && shared.length === 0) return <p data-testid="shared-sig-none" style={{ fontSize: 14, color: "var(--ui-text-muted)" }}>No shared mailboxes are connected yet. Once one is (for example info@), its signature is set here.</p>;

  return (
    <div className="settings-grid" style={{ marginTop: 16 }}>
      <div style={{ width: "100%" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#6b7280" }}>
          Each shared mailbox has one signature for the whole brokerage. It is added whenever anyone sends email as that mailbox.
        </p>
        <select
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={!loaded}
          aria-label="Shared mailbox"
          style={{ marginBottom: 8, padding: 6, borderRadius: 6, border: "1px solid var(--ui-border)", fontSize: 13 }}
        >
          {shared.map((m) => (
            <option key={m.address} value={m.address}>{m.display_name} ({m.address})</option>
          ))}
        </select>
        {address ? (
          <SignatureBuilder key={address} html={html} defaults={sharedDefaults} disabled={!loaded} onChange={setDraft} label="Shared mailbox signature" testIdPrefix="shared-sig" />
        ) : null}
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="button" onClick={() => void save()} disabled={!loaded || !address || saving}>
            {saving ? "Saving…" : "Save signature"}
          </Button>
          {status && <span style={{ fontSize: 13, color: status === "Saved." ? "#0d9b6c" : "#b00020" }}>{status}</span>}
        </div>
      </div>
    </div>
  );
}
