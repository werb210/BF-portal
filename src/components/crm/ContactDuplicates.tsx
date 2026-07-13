// BF_PORTAL_CONTACT_MERGE_v1
// Surfaces likely duplicates of the contact being viewed and merges them.
//
// This matters because the CRM is actively fragmenting live leads: Mike Cotic exists twice
// (contact form vs Microsoft Bookings, different email AND different phone), Juergen
// Zischler three times, Wayne Beamish twice. A rep looking at one record cannot see the
// calls, SMS and applications sitting on the other.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";

type Candidate = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  created_at: string | null;
  match_email: string | null;
  match_phone: string | null;
  name_similarity: number | null;
  applications: number;
  calls: number;
  messages: number;
};

export function ContactDuplicates({ contactId, onMerged }: { contactId?: string; onMerged?: () => void }) {
  const [items, setItems] = useState<Candidate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!contactId) return;
    try {
      const r = await api.get<{ data?: Candidate[] } | Candidate[]>(
        `/api/crm/contacts/${contactId}/duplicate-candidates`,
      );
      const d = (r as { data?: Candidate[] })?.data ?? (r as Candidate[]) ?? [];
      setItems(Array.isArray(d) ? d : []);
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, [contactId]);

  useEffect(() => { void load(); }, [load]);

  const loserIds = Object.keys(selected).filter((k) => selected[k]);

  const merge = useCallback(async () => {
    if (!contactId || loserIds.length === 0) return;
    // Irreversible from the user's point of view, so make them mean it.
    const names = items.filter((i) => loserIds.includes(i.id)).map((i) => i.name ?? i.id).join(", ");
    if (!window.confirm(
      `Merge ${loserIds.length} record${loserIds.length === 1 ? "" : "s"} into this contact?\n\n${names}\n\n` +
      `All their calls, messages, tasks, documents and applications move here. ` +
      `The other record${loserIds.length === 1 ? " is" : "s are"} archived.`,
    )) return;

    setBusy(true);
    setMsg("");
    try {
      const r = await api.post<{ data?: { moved?: Record<string, number> } }>(
        `/api/crm/contacts/merge`,
        { survivorId: contactId, loserIds },
      );
      const moved = (r as any)?.data?.moved ?? (r as any)?.moved ?? {};
      const total = Object.values(moved as Record<string, number>).reduce((a, b) => a + Number(b || 0), 0);
      setMsg(`Merged. ${total} record${total === 1 ? "" : "s"} moved onto this contact.`);
      setSelected({});
      await load();
      onMerged?.();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Merge failed.");
    } finally {
      setBusy(false);
    }
  }, [contactId, loserIds, items, load, onMerged]);

  if (!loaded || items.length === 0) return null;

  const why = (c: Candidate) => {
    const bits: string[] = [];
    if (c.match_email) bits.push("same email");
    if (c.match_phone) bits.push("same phone");
    if (!c.match_email && !c.match_phone && c.name_similarity != null) {
      bits.push(`similar name (${Math.round(Number(c.name_similarity) * 100)}%)`);
    }
    return bits.join(", ");
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>
        Possible duplicates ({items.length})
      </h3>
      <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 10 }}>
        Tick the records that are the same person, then merge them into this one.
      </div>

      {items.map((c) => {
        const activity = c.applications + c.calls + c.messages;
        return (
          <label
            key={c.id}
            style={{
              display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer",
              padding: "8px 0", borderTop: "1px solid var(--ui-border)",
            }}
          >
            <input
              type="checkbox"
              checked={!!selected[c.id]}
              onChange={(e) => setSelected((s) => ({ ...s, [c.id]: e.target.checked }))}
              style={{ marginTop: 3 }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name ?? "(no name)"}</div>
              {c.company_name && (
                <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{c.company_name}</div>
              )}
              {c.email && <div style={{ fontSize: 12 }}>{c.email}</div>}
              {c.phone && <div style={{ fontSize: 12 }}>{c.phone}</div>}
              <div style={{ fontSize: 11, color: "var(--ui-text-muted)", marginTop: 2 }}>
                {why(c)}
                {activity > 0 && (
                  <> · {c.applications > 0 && `${c.applications} app${c.applications === 1 ? "" : "s"}, `}
                  {c.calls} call{c.calls === 1 ? "" : "s"}, {c.messages} message{c.messages === 1 ? "" : "s"}</>
                )}
              </div>
            </div>
          </label>
        );
      })}

      <button
        type="button"
        disabled={busy || loserIds.length === 0}
        onClick={() => void merge()}
        style={{
          marginTop: 10, width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: 13,
          fontWeight: 600, cursor: loserIds.length === 0 ? "default" : "pointer",
          border: "1px solid var(--ui-accent-blue)",
          background: loserIds.length === 0 ? "var(--ui-surface)" : "var(--ui-accent-blue)",
          color: loserIds.length === 0 ? "var(--ui-text-muted)" : "#fff",
        }}
      >
        {busy ? "Merging..." : `Merge ${loserIds.length || ""} into this contact`.trim()}
      </button>

      {msg && (
        <div style={{
          marginTop: 8, fontSize: 12, fontWeight: 600, padding: "6px 8px", borderRadius: 6,
          color: /^Merged/i.test(msg) ? "#14532d" : "#7f1d1d",
          background: /^Merged/i.test(msg) ? "#dcfce7" : "#fee2e2",
          border: `1px solid ${/^Merged/i.test(msg) ? "#86efac" : "#fca5a5"}`,
        }}>{msg}</div>
      )}
    </div>
  );
}
