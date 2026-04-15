import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useSilo } from "@/hooks/useSilo";
import Topbar from "@/components/layout/Topbar";
import MayaPanel from "@/components/maya/MayaPanel";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/portal", roles: ["Admin", "Staff", "Ops"] },
  { label: "Applications", path: "/applications", roles: ["Admin", "Staff"] },
  { label: "Pipeline", path: "/pipeline", roles: ["Admin", "Staff", "Ops"] },
  { label: "CRM", path: "/crm", roles: ["Admin", "Staff"] },
  { label: "Communications", path: "/communications", roles: ["Admin", "Staff"] },
  { label: "Calendar", path: "/calendar", roles: ["Admin", "Staff", "Ops"] },
  { label: "Marketing", path: "/marketing", roles: ["Admin"] },
  { label: "Lenders", path: "/lenders", roles: ["Admin", "Staff"] },
  { label: "Settings", path: "/settings", roles: ["Admin", "Staff", "Ops"] }
] as const;

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const [isMayaOpen, setIsMayaOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();
  const { silo } = useSilo();
  const role = (user as { role?: string } | null)?.role;

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.some((allowedRole) => allowedRole.toLowerCase() === role?.toLowerCase())
  );

  const NavContent = () => (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto" }}>
      {visibleItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => setMobileNavOpen(false)}
          style={({ isActive }) => ({
            display: "block",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "var(--ui-text)" : "var(--ui-text-muted)",
            background: isActive ? "rgba(59,130,246,0.18)" : "transparent",
            textDecoration: "none",
            marginBottom: 2,
            transition: "background 0.15s"
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <aside
        style={{
          width: 220,
          minWidth: 220,
          background: "var(--ui-surface-strong)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          overflowY: "auto",
          boxShadow: "var(--ui-shadow-strong)",
          flexShrink: 0
        }}
        className="app-sidebar"
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.01em",
            marginBottom: 24,
            padding: "0 4px",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <img src="/images/Header.png" alt="Boreal" style={{ height: 28, width: "auto" }} />
          <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{String(silo ?? "BF").toUpperCase()}</span>
        </div>
        <NavContent />
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar onToggleSidebar={() => setMobileNavOpen((prev) => !prev)} onOpenMaya={() => setIsMayaOpen(true)} />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
            background: "var(--bg-primary)"
          }}
        >
          {children ?? <Outlet />}
        </main>
      </div>

      {mobileNavOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex"
          }}
        >
          <div
            style={{
              width: 260,
              background: "var(--ui-surface-strong)",
              padding: "20px 12px",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto"
            }}
          >
            <button
              onClick={() => setMobileNavOpen(false)}
              style={{
                alignSelf: "flex-end",
                background: "none",
                border: "none",
                color: "var(--ui-text)",
                fontSize: 22,
                cursor: "pointer",
                marginBottom: 16
              }}
            >
              ×
            </button>
            <NavContent />
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileNavOpen(false)} />
        </div>
      )}

      <MayaPanel open={isMayaOpen} onClose={() => setIsMayaOpen(false)} />
    </div>
  );
}
