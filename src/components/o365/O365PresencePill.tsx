// BF_PORTAL_O365_UI_v1 - read-only Teams/Outlook presence pill (GET /api/o365/presence).
import { useEffect, useState } from "react";
import { api } from "@/api";

type PresenceResp = { connected: boolean; availability?: string | null; activity?: string | null; error?: string };

const COLORS: Record<string, string> = {
  Available: "#22c55e",
  AvailableIdle: "#22c55e",
  Away: "#f59e0b",
  BeRightBack: "#f59e0b",
  Busy: "#ef4444",
  BusyIdle: "#ef4444",
  DoNotDisturb: "#ef4444",
  Offline: "#94a3b8",
  PresenceUnknown: "#94a3b8",
};

export default function O365PresencePill() {
  const [presence, setPresence] = useState<PresenceResp | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => {
      api
        .get<PresenceResp>("/api/o365/presence")
        .then((r) => { if (alive) setPresence(r); })
        .catch(() => { if (alive) setPresence(null); });
    };
    load();
    const timer = window.setInterval(load, 60000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);
  if (!presence || !presence.connected || !presence.availability) return null;
  const color = COLORS[presence.availability] ?? "#94a3b8";
  const label = presence.availability.replace(/([a-z])([A-Z])/g, "$1 $2");
  return (
    <span
      title={`Teams: ${presence.activity ?? presence.availability}`}
      style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid", borderColor: color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, color }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}
