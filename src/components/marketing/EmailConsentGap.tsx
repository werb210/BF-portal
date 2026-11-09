// BF_PORTAL_v912_EMAIL_CONSENT_RECORD - email campaigns only reach contacts with email consent. Contacts imported
// from a marketing list carried no recorded email consent, so they were left out. This shows how many are missing
// and lets an Admin record, once, where their consent came from (an audited, bulk "marketing_list" basis).
import { useEffect, useState } from "react";
import { api } from "@/api";
import { useAuth } from "@/hooks/useAuth";

type Props = { apiBase?: string; tags?: string[]; onRecorded?: (n: number) => void };

export function consentGapPath(apiBase: string, tags: string[]): string {
  return tags.length ? `${apiBase}/email/consent-gap?tags=${encodeURIComponent(tags.join(","))}` : `${apiBase}/email/consent-gap`;
}

export function canRecord(source: string, confirmed: boolean): boolean {
  return confirmed && source.trim().length >= 5;
}

export default function EmailConsentGap({ apiBase = "/api/marketing", tags = [], onRecorded }: Props) {
  const { user } = useAuth();
  const isAdmin = String((user as { role?: string } | null)?.role ?? "").toLowerCase() === "admin";
  const [missing, setMissing] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const tagKey = tags.join(",");

  useEffect(() => {
    let alive = true;
    api.get<{ data?: { missing?: number }; missing?: number }>(consentGapPath(apiBase, tags))
      .then((r) => { if (alive) setMissing(Number(r?.data?.missing ?? r?.missing ?? 0)); })
      .catch((err) => { console.warn("[email-consent] gap lookup failed", err); if (alive) setMissing(null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, tagKey, reload]);

  if (!missing) return note ? <p style={{ fontSize: "0.8rem", color: "var(--ui-text)" }}>{note}</p> : null;

  const record = async () => {
    setBusy(true); setNote(null);
    try {
      const r = await api.post<{ data?: { recorded?: number }; recorded?: number }>(`${apiBase}/email/consent-record`,
        { source: source.trim(), confirm: true, ...(tags.length ? { tags } : {}) });
      const n = Number(r?.data?.recorded ?? r?.recorded ?? 0);
      setNote(`Email consent recorded for ${n} contact(s).`);
      setOpen(false); setSource(""); setConfirmed(false); setReload((x) => x + 1);
      onRecorded?.(n);
    } catch (err) {
      setNote(String((err as { message?: string })?.message ?? "Couldn't record consent."));
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-2" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, fontSize: "0.85rem" }}>
      <div style={{ color: "var(--ui-text)" }}>
        <strong>{missing}</strong> contact(s) with an email address have no email consent on file, so they won't receive this campaign.
        {!isAdmin && " An Admin can record their consent."}
      </div>
      {isAdmin && !open && (
        <button type="button" className="ui-button ui-button--secondary mt-2" onClick={() => setOpen(true)}>Record email consent</button>
      )}
      {isAdmin && open && (
        <div className="mt-2" style={{ display: "grid", gap: 8 }}>
          <label style={{ color: "var(--ui-text)" }}>Where did their consent come from?
            <input className="ui-input mt-1" style={{ width: "100%" }} value={source} onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Imported marketing list, opted in on boreal.financial" />
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "flex-start", color: "var(--ui-text)" }}>
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>I confirm these {missing} contact(s) agreed to receive marketing email. Contacts who opted out stay excluded.</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="ui-button ui-button--primary" disabled={busy || !canRecord(source, confirmed)} onClick={record}>
              {busy ? "Recording..." : `Record consent for ${missing}`}
            </button>
            <button type="button" className="ui-button ui-button--secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {note && <p className="mt-1" style={{ color: "var(--ui-text)" }}>{note}</p>}
    </div>
  );
}
