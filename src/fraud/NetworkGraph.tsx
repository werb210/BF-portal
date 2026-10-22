// BF_PORTAL_v846_FRAUD - the fraud network map (check 12, ported from Keystone): this application in the middle, the details it shares
// (phone, email, address, bank account, device, connection, director) around it, and the other applications that
// share them on the outside. Applications confirmed as fraud are drawn in red with the word "Fraud".
import type { Network, NetworkNode } from "@/fraud/fraudApi";

export type Placed = NetworkNode & { x: number; y: number };

export const VIEW = { w: 640, h: 460 };

const TYPE_LABEL: Record<NetworkNode["type"], string> = {
  application: "Application", phone: "Phone", email: "Email", address: "Address", bank_account: "Bank account",
  device: "Device", ip: "Connection", director: "Director",
};

/** Places nodes on three rings. Pure, deterministic, and keeps every node inside the view box. */
export function layoutNetwork(net: Network): Placed[] {
  const cx = VIEW.w / 2, cy = VIEW.h / 2;
  const current = net.nodes.find((n) => n.current) ?? net.nodes[0];
  if (!current) return [];
  const ids = net.nodes.filter((n) => n.type !== "application");
  const apps = net.nodes.filter((n) => n.type === "application" && n.id !== current.id);
  const placed: Placed[] = [{ ...current, x: cx, y: cy }];
  const angleOf = new Map<string, number>();
  ids.forEach((n, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, ids.length) - Math.PI / 2;
    angleOf.set(n.id, a);
    placed.push({ ...n, x: cx + Math.cos(a) * 120, y: cy + Math.sin(a) * 105 });
  });
  // Each other application sits beyond the first detail it shares, fanned out when several share the same one.
  const perAnchor = new Map<string, number>();
  apps.forEach((n, i) => {
    const anchor = net.edges.find((e) => e.to === n.id && angleOf.has(e.from))?.from;
    const base = anchor ? angleOf.get(anchor)! : (2 * Math.PI * i) / Math.max(1, apps.length);
    const k = perAnchor.get(anchor ?? "") ?? 0;
    perAnchor.set(anchor ?? "", k + 1);
    const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.32;
    placed.push({ ...n, x: Math.min(VIEW.w - 70, Math.max(70, cx + Math.cos(a) * 255)), y: Math.min(VIEW.h - 24, Math.max(24, cy + Math.sin(a) * 190)) });
  });
  return placed;
}

const short = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function NetworkGraph({ network }: { network: Network }) {
  const placed = layoutNetwork(network);
  const at = new Map(placed.map((p) => [p.id, p]));
  const others = placed.filter((p) => p.type === "application" && !p.current);
  if (!others.length) {
    return <p data-testid="network-empty" style={{ fontSize: 14, color: "var(--ui-text)" }}>No other application shares a phone, email, address, bank account, device or director with this one.</p>;
  }
  return (
    <figure style={{ margin: 0 }}>
      <svg data-testid="network-graph" role="img" aria-label={`Network: this application is linked to ${others.length} other application(s)`} viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} style={{ width: "100%", maxWidth: 760, height: "auto", display: "block" }}>
        {network.edges.map((e, i) => {
          const a = at.get(e.from), b = at.get(e.to);
          if (!a || !b) return null;
          const hot = a.fraud || b.fraud;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot ? "#b91c1c" : "#64748b"} strokeWidth={hot ? 2.5 : 1.5} />;
        })}
        {placed.map((p) => {
          if (p.type === "application") {
            const fill = p.current ? "#dbeafe" : p.fraud ? "#fee2e2" : "#f8fafc";
            const stroke = p.current ? "#1e3a8a" : p.fraud ? "#b91c1c" : "#475569";
            return (
              <g key={p.id} data-testid={p.fraud ? "network-node-fraud" : "network-node-app"}>
                <rect x={p.x - 66} y={p.y - 20} width={132} height={40} rx={8} fill={fill} stroke={stroke} strokeWidth={p.current || p.fraud ? 2.5 : 1.5} />
                <text x={p.x} y={p.y - 3} textAnchor="middle" fontSize={12} fontWeight={700} fill="#0f172a">{short(p.label, 20)}</text>
                <text x={p.x} y={p.y + 12} textAnchor="middle" fontSize={10.5} fill={p.fraud ? "#7f1d1d" : "#334155"}>{p.current ? "This application" : p.fraud ? "Fraud" : "Application"}</text>
              </g>
            );
          }
          return (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={30} fill="#fef9c3" stroke="#a16207" strokeWidth={1.5} />
              <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#422006">{TYPE_LABEL[p.type]}</text>
              <text x={p.x} y={p.y + 11} textAnchor="middle" fontSize={9.5} fill="#422006">{short(p.label.replace(/^(Phone|Email|Account|Address|Director)\s*/, ""), 14)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 6 }}>
        Shared details are shown partly hidden. Red boxes are applications confirmed as fraud.
      </figcaption>
    </figure>
  );
}
