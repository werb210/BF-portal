// BF_PORTAL_BI_SILO_NAV_v56 — BI silo nav matches its operating model.
// BI staff don't run a sales pipeline (they're insurance underwriters,
// not loan brokers), they don't use staff-side Communications or
// Calendar (those flows live in BF), and they DO need Pipeline +
// Lenders so they can track underwriting workload and the panel of
// insurers they place with. Communications + Calendar removed; Pipeline
// + Lenders added. BF and SLF nav definitions are unchanged.
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useSilo } from "@/hooks/useSilo";
import Topbar from "@/components/layout/Topbar";
import MayaChat from "@/components/maya/MayaChat";


const TOPBAR_HEIGHT = 68;

type NavItem = { label: string; path: string; roles: string[] };

const BF_NAV: NavItem[] = [
  { label: "Dashboard",      path: "/portal",         roles: ["Admin", "Staff", "Ops"] },
  { label: "Pipeline",       path: "/pipeline",        roles: ["Admin", "Staff", "Ops"] },
  { label: "Contacts",       path: "/crm/contacts",    roles: ["Admin", "Staff"] },
  { label: "Communications", path: "/communications",  roles: ["Admin", "Staff"] },
  { label: "Calendar",       path: "/calendar",        roles: ["Admin", "Staff", "Ops"] },
  { label: "Marketing",      path: "/marketing",       roles: ["Admin"] },
  { label: "Lenders",        path: "/lenders",         roles: ["Admin", "Staff"] },
  { label: "Settings",       path: "/settings",        roles: ["Admin", "Staff", "Ops"] },
];

const BI_NAV: NavItem[] = [
  { label: "Dashboard",      path: "/portal",          roles: ["Admin", "Staff", "Ops"] },
  { label: "Pipeline",       path: "/pipeline",        roles: ["Admin", "Staff", "Ops"] },
  { label: "Contacts",       path: "/crm/contacts",    roles: ["Admin", "Staff"] },
  { label: "Lenders",        path: "/bi-lenders",         roles: ["Admin", "Staff"] },
  { label: "Marketing",      path: "/marketing",       roles: ["Admin"] },
  { label: "Settings",       path: "/settings",        roles: ["Admin", "Staff", "Ops"] },
];

const SLF_NAV: NavItem[] = [
  { label: "Dashboard",      path: "/portal",          roles: ["Admin", "Staff", "Ops"] },
  { label: "Pipeline",       path: "/pipeline",        roles: ["Admin", "Staff", "Ops"] },
  { label: "Contacts",       path: "/crm/contacts",    roles: ["Admin", "Staff"] },
  { label: "Communications", path: "/communications",  roles: ["Admin", "Staff"] },
  { label: "Calendar",       path: "/calendar",        roles: ["Admin", "Staff", "Ops"] },
  { label: "Lenders",        path: "/lenders",         roles: ["Admin", "Staff"] },
  { label: "Settings",       path: "/settings",        roles: ["Admin", "Staff", "Ops"] },
];

const SILO_NAV: Record<string, NavItem[]> = { BF: BF_NAV, BI: BI_NAV, SLF: SLF_NAV };

const SILO_BRAND: Record<string, { label: string; accent: string }> = {
  BF:  { label: "Boreal Financial",    accent: "#2563eb" },
  BI:  { label: "Boreal Insurance",    accent: "#7c3aed" },
  SLF: { label: "Site Level Finance",  accent: "#d97706" },
};

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const [mayaOpen, setMayaOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();
  const { silo } = useSilo();
  const role = (user as { role?: string } | null)?.role ?? "";

  const activeSilo = (silo ?? "BF").toUpperCase() as "BF" | "BI" | "SLF";
  const brand = SILO_BRAND[activeSilo] ?? SILO_BRAND.BF!;
  const roleUpper = role.toUpperCase();
  const isAdmin = roleUpper === "ADMIN";
  const isMarketing = roleUpper === "MARKETING";
  const isStaff = roleUpper === "STAFF";

  const canSee = (path: string) => {
    const tab = path.replace(/^\//, "").toLowerCase();
    if (isAdmin) return true;
    if (isMarketing) return tab !== "lenders";
    if (isStaff) return tab !== "marketing";
    return false;
  };

  const navItems = (SILO_NAV[activeSilo] ?? BF_NAV).filter((item) => {
    if (isAdmin || isMarketing || isStaff) return canSee(item.path);
    return item.roles.some((r) => r.toLowerCase() === role.toLowerCase());
  });

  const NavContent = () => (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto" }}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => setMobileNavOpen(false)}
          style={({ isActive }) => ({
            display: "block",
            padding: "9px 12px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "#fff" : "var(--ui-text-muted)",
            background: isActive ? brand.accent : "transparent",
            textDecoration: "none",
            transition: "background 0.15s, color 0.15s",
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220, minWidth: 220,
          background: "var(--ui-surface-strong)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column",
          padding: "20px 12px 0",
          overflowY: "auto",
          boxShadow: "var(--ui-shadow-strong)",
          flexShrink: 0,
        }}
        className="app-sidebar"
      >
        {/* Brand header */}
        <div style={{ marginBottom: 24, padding: "0 4px", display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/images/Header.png" alt="Boreal" style={{ height: 52, width: "auto" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0b1220", lineHeight: 1.2 }}>
              {brand.label}
            </div>
            <div style={{ fontSize: 10, color: brand.accent, fontWeight: 600, letterSpacing: "0.05em" }}>
              {activeSilo}
            </div>
          </div>
        </div>

        <NavContent />

        {/* Maya toggle */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setMayaOpen((prev) => !prev)}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "space-between", padding: "8px 4px",
              background: "none", border: "none",
              color: "var(--ui-text-muted)", fontSize: 12,
              fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em",
            }}
          >
            <span>MAYA</span>
            <span>{mayaOpen ? "▼" : "▲"}</span>
          </button>
          {mayaOpen && (
            <div style={{ paddingBottom: 12, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              <MayaChat />
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 30, flexShrink: 0 }}><Topbar onToggleSidebar={() => setMobileNavOpen((prev) => !prev)} /></div>
        <main style={{ height: `calc(100vh - ${TOPBAR_HEIGHT}px)`, overflowY: "auto", padding: 24, background: "var(--bg-primary)" }}>
          {children ?? <Outlet />}
        </main>
      </div>

      {/* ── Mobile overlay nav ── */}
      {mobileNavOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ width: 260, background: "var(--ui-surface-strong)", padding: "20px 12px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <button onClick={() => setMobileNavOpen(false)} style={{ alignSelf: "flex-end", background: "none", border: "none", color: "var(--ui-text)", fontSize: 22, cursor: "pointer", marginBottom: 16 }}>×</button>
            <NavContent />
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileNavOpen(false)} />
        </div>
      )}

    </div>
  );
}

// BF_PORTAL_BI_SILO_NAV_v56_APPLAYOUT_ANCHOR
