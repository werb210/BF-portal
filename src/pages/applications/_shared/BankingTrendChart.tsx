// BF_PORTAL_BLOCK_1_31A_TREND_CHART
import { Fragment } from "react";

export type BankingTrendMonth = {
  month: string;
  deposits: number;
  withdrawals: number;
  net: number;
  endingBalance: number | null;
  nsfCount: number;
};

const colors = {
  text: "#0f172a",
  muted: "#64748b",
  accent: "#1e3a8a",
  accentLight: "#3b82f6",
  amber: "#f59e0b",
  grid: "#f1f5f9",
};

function fmtMonth(m: string): string {
  const d = new Date(m);
  if (Number.isNaN(d.getTime())) return m;
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

interface Props {
  months: BankingTrendMonth[];
  width?: number;
  height?: number;
}

export default function BankingTrendChart({ months, width = 520, height = 200 }: Props) {
  if (!months || months.length === 0) {
    return (
      <div style={{ color: colors.muted, fontSize: 13, padding: "24px 0", textAlign: "center" }}>
        No monthly data yet.
      </div>
    );
  }
  const pad = { l: 56, r: 16, t: 24, b: 28 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const allValues: number[] = [];
  for (const m of months) {
    allValues.push(m.deposits);
    allValues.push(m.withdrawals);
    if (m.endingBalance != null) allValues.push(m.endingBalance);
  }
  const max = Math.max(1, ...allValues);
  const min = Math.min(0, ...allValues);

  const xFor = (i: number) =>
    pad.l + (months.length === 1 ? innerW / 2 : (i / (months.length - 1)) * innerW);
  const yFor = (v: number) =>
    pad.t + innerH - ((v - min) / (max - min || 1)) * innerH;

  function pathFor(key: "deposits" | "withdrawals" | "endingBalance"): string {
    const segments: string[] = [];
    let started = false;
    months.forEach((m, i) => {
      const v = key === "endingBalance" ? m.endingBalance : m[key];
      if (v === null || v === undefined) return;
      const x = xFor(i);
      const y = yFor(Number(v));
      segments.push((started ? "L" : "M") + " " + x + " " + y);
      started = true;
    });
    return segments.join(" ");
  }

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={"0 0 " + width + " " + height}
      style={{ maxWidth: "100%", display: "block" }}
    >
      {gridLevels.map((p) => {
        const y = pad.t + innerH * (1 - p);
        const v = min + (max - min) * p;
        return (
          <Fragment key={p}>
            <line x1={pad.l} y1={y} x2={width - pad.r} y2={y} stroke={colors.grid} strokeWidth={1} />
            <text x={pad.l - 6} y={y + 3} fontSize={9} textAnchor="end" fill={colors.muted}>
              {"$" + Math.round(v / 1000) + "K"}
            </text>
          </Fragment>
        );
      })}

      {months.map((m, i) => (
        <text
          key={i}
          x={xFor(i)}
          y={height - 8}
          fontSize={10}
          textAnchor="middle"
          fill={colors.muted}
        >
          {fmtMonth(m.month)}
        </text>
      ))}

      <path d={pathFor("withdrawals")} stroke={colors.accent} strokeWidth={2} fill="none" />
      <path d={pathFor("deposits")} stroke={colors.accentLight} strokeWidth={2} fill="none" />
      <path
        d={pathFor("endingBalance")}
        stroke={colors.amber}
        strokeWidth={2}
        fill="none"
        strokeDasharray="3 3"
      />

      <g transform={"translate(" + (pad.l + 8) + ", " + (pad.t - 12) + ")"} fontSize={10}>
        <circle cx={4} cy={4} r={4} fill={colors.accent} />
        <text x={14} y={8} fill={colors.text}>Withdrawals</text>
        <circle cx={94} cy={4} r={4} fill={colors.accentLight} />
        <text x={104} y={8} fill={colors.text}>Deposits</text>
        <circle cx={170} cy={4} r={4} fill={colors.amber} />
        <text x={180} y={8} fill={colors.text}>Ending Balance</text>
      </g>
    </svg>
  );
}
