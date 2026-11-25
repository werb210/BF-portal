// BF_PORTAL_SAME_MENU_v1 (2026-11-24) - "Partners" is the same menu entry in every business: the people we work with
// (lenders, referrers, reps). A tab row on each partner page switches between them.
import { NavLink } from "react-router-dom";

export type PartnerTab = { to: string; label: string };

export default function PartnersTabs({ tabs }: { tabs: PartnerTab[] }) {
  return (
    <div role="tablist" aria-label="Partners" style={{ display: "flex", gap: 6, padding: "10px 16px 0", borderBottom: "1px solid var(--ui-border)" }}>
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          style={({ isActive }) => ({
            padding: "8px 14px",
            fontSize: 14,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "var(--ui-text)" : "var(--ui-text-muted)",
            borderBottom: isActive ? "2px solid var(--accent, #1E3A8A)" : "2px solid transparent",
            textDecoration: "none",
          })}
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}

export const BF_PARTNER_TABS: PartnerTab[] = [
  { to: "/lenders", label: "Lenders" },
  { to: "/partners/referrers", label: "Referrers" },
];
export const BI_PARTNER_TABS: PartnerTab[] = [
  { to: "/silo/bi/lender", label: "Lenders" },
  { to: "/silo/bi/referrer", label: "Referrers" },
  { to: "/silo/bi/reps", label: "Reps" },
];
