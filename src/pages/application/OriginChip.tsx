// BF_PORTAL_v938_CARD_REDESIGN - "Where this came from" as a small chip in the card header instead of a box above every
// tab. Click it to see the details. A lender referral still waiting for Accept / Decline opens by itself, so it is never
// missed. Nothing shows for website, Maya or staff-entered files.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { api } from "@/api";
import ApplicationOriginPanel, { type ApplicationOrigin } from "./ApplicationOriginPanel";

const chip: CSSProperties = { padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", cursor: "pointer", fontFamily: "inherit" };
const pop: CSSProperties = { position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 30, width: 460, maxWidth: "90vw", background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.15)", padding: 8 };

export function originLabel(o: ApplicationOrigin): string {
  if (o.kind === "lender") return `Lender referral: ${o.partner}`;
  if (o.kind === "broker") return `Broker file: ${o.partner}`;
  return `Referred by ${o.partner}`;
}

export default function OriginChip({ applicationId }: { applicationId: string }) {
  const [origin, setOrigin] = useState<ApplicationOrigin | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await api.get<{ origin?: ApplicationOrigin | null }>(`/api/application-origin/${encodeURIComponent(applicationId)}`);
      const o = res?.origin ?? null;
      setOrigin(o);
      if (o?.kind === "lender" && o.referral?.status === "pending") setOpen(true);
    } catch { setOrigin(null); }
  }, [applicationId]);
  useEffect(() => { if (applicationId) void load(); }, [applicationId, load]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  if (!origin) return null;
  return (
    <span ref={ref} style={{ position: "relative" }}>
      <button type="button" data-testid="origin-chip" style={chip} aria-expanded={open} onClick={() => setOpen((v) => !v)}>{originLabel(origin)} ▾</button>
      {open ? <div style={pop}><ApplicationOriginPanel applicationId={applicationId} initial={origin} /></div> : null}
    </span>
  );
}
