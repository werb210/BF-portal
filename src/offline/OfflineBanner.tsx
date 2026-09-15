// BF_PORTAL_OFFLINE_OUTBOX_v251
import { useEffect, useState } from "react";
import { dismissFailed, flushOutbox, readOutbox, subscribeOutbox, type OutboxItem } from "./outbox";

export default function OfflineBanner() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);
  const [items, setItems] = useState<OutboxItem[]>(() => readOutbox());
  const [showFailed, setShowFailed] = useState(false);
  useEffect(() => {
    const refresh = () => setItems(readOutbox()); const unsubscribe = subscribeOutbox(refresh);
    const goOnline = () => { setOnline(true); void flushOutbox(); }; const goOffline = () => setOnline(false);
    const onVisible = () => { if (document.visibilityState === "visible" && navigator.onLine !== false) void flushOutbox(); };
    window.addEventListener("online", goOnline); window.addEventListener("offline", goOffline); document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => { if (navigator.onLine !== false && readOutbox().some((item) => item.status === "pending")) void flushOutbox(); }, 30_000);
    if (navigator.onLine !== false) void flushOutbox();
    return () => { unsubscribe(); window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); document.removeEventListener("visibilitychange", onVisible); window.clearInterval(timer); };
  }, []);
  const pending = items.filter((item) => item.status === "pending"); const failed = items.filter((item) => item.status === "failed");
  if (online && pending.length === 0 && failed.length === 0) return null;
  const bar: React.CSSProperties = { position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 9000, borderRadius: 10, padding: "10px 14px", fontSize: 13, boxShadow: "0 6px 20px rgba(0,0,0,0.18)" };
  return <div data-testid="offline-banner" role="status" style={{ ...bar, background: online ? "#0B1F3A" : "#7c2d12", color: "#fff" }}>
    {!online ? <span>You're offline. Notes, tasks and call outcomes are saved on this device and sent when you reconnect.</span> : pending.length > 0 ? <span>Sending {pending.length} saved item{pending.length === 1 ? "" : "s"}...</span> : null}
    {pending.length > 0 && !online ? <strong style={{ marginLeft: 8 }}>{pending.length} waiting</strong> : null}
    {failed.length > 0 ? <span style={{ marginLeft: 8 }}><button type="button" onClick={() => setShowFailed((value) => !value)} style={{ background: "none", border: "none", color: "#fecaca", textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>{failed.length} couldn't be sent</button></span> : null}
    {showFailed && failed.length > 0 ? <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>{failed.map((item) => <li key={item.id} style={{ marginBottom: 4 }}>{item.label}: {item.error}{" "}<button type="button" onClick={() => dismissFailed(item.id)} style={{ background: "none", border: "none", color: "#fff", textDecoration: "underline", cursor: "pointer", fontSize: 12 }}>Dismiss</button></li>)}</ul> : null}
  </div>;
}
