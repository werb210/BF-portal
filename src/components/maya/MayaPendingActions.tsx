// BF_PORTAL_MAYA_PENDING_ACTIONS_v784 - Maya no longer sends an SMS on its own
// say-so. It queues the text and staff confirm or cancel it here. The list is
// refreshed when the panel opens and after every Maya reply (bump refreshKey).
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";

export type MayaPendingAction = {
  id: string;
  type?: string | null;
  to?: string | null;
  to_name?: string | null;
  message?: string | null;
  body?: string | null;
  payload?: { to?: string | null; message?: string | null; body?: string | null } | null;
};

type Props = { refreshKey?: number };

function normalize(res: unknown): MayaPendingAction[] {
  if (Array.isArray(res)) return res as MayaPendingAction[];
  const items = (res as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as MayaPendingAction[]) : [];
}

function recipient(a: MayaPendingAction): string {
  const to = a.to ?? a.payload?.to ?? "";
  return a.to_name ? `${a.to_name}${to ? ` (${to})` : ""}` : to || "Unknown";
}

function text(a: MayaPendingAction): string {
  return a.message ?? a.body ?? a.payload?.message ?? a.payload?.body ?? "";
}

export default function MayaPendingActions({ refreshKey = 0 }: Props) {
  const [items, setItems] = useState<MayaPendingAction[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/maya/pending-actions");
      setItems(normalize(res));
    } catch {
      // Nothing pending to show; the chat itself still works.
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function decide(id: string, decision: "confirm" | "cancel") {
    setBusyId(id);
    setError(null);
    try {
      const res = await api.post<{ ok?: boolean; status?: string }>(
        `/api/maya/pending-actions/${encodeURIComponent(id)}/${decision}`,
        {},
      );
      if (res && res.ok === false) throw new Error(res.status || "failed");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const detail = err instanceof Error && err.message && err.message !== "API_ERROR" ? `: ${err.message}` : ".";
      setError(decision === "confirm" ? `Could not send the text${detail}` : `Could not cancel the text${detail}`);
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0 && !error) return null;

  return (
    <div aria-label="Texts waiting for your OK" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 12, color: "#B91C1C", background: "#FEF2F2", padding: "6px 8px", borderRadius: 8 }}>
          {error}
        </p>
      ) : null}
      {items.map((item) => (
        <div key={item.id} data-testid="maya-pending-action" style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0B1F3A" }}>Text waiting for your OK</div>
          <div style={{ fontSize: 12, color: "#334155" }}>
            <strong style={{ color: "#0B1F3A" }}>To:</strong> {recipient(item)}
          </div>
          <div style={{ fontSize: 13, color: "#0B1F3A", whiteSpace: "pre-wrap" }}>{text(item)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={busyId === item.id} onClick={() => void decide(item.id, "confirm")} style={sendBtn}>
              Send
            </button>
            <button type="button" disabled={busyId === item.id} onClick={() => void decide(item.id, "cancel")} style={cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const cardStyle: CSSProperties = {
  background: "#ffffff",
  color: "#0B1F3A",
  border: "1px solid #CBD5E1",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const sendBtn: CSSProperties = {
  background: "#1D4ED8",
  color: "#ffffff",
  border: "none",
  borderRadius: 6,
  padding: "6px 12px",
  fontWeight: 600,
  cursor: "pointer",
};
const cancelBtn: CSSProperties = {
  background: "#ffffff",
  color: "#334155",
  border: "1px solid #94A3B8",
  borderRadius: 6,
  padding: "6px 12px",
  fontWeight: 600,
  cursor: "pointer",
};
