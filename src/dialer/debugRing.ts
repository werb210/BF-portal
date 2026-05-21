// BF_PORTAL_BLOCK_v600_DIALER_PROVIDER_v1
type Entry = { ts: string; tag: string; data?: unknown };
const RING: Entry[] = [];
const CAP = 200;
export function ringPush(tag: string, data?: unknown): void { RING.push({ ts: new Date().toISOString(), tag, data }); if (RING.length > CAP) RING.splice(0, RING.length - CAP); }
export function ringDump(): Entry[] { return RING.slice(); }
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.altKey && (e.key === "d" || e.key === "D")) console.log("=== [dialer.ring] last %d events ===", RING.length, ringDump());
  });
  (window as any).__dialerRing = () => ringDump();
}
