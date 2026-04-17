import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useSilo } from "@/hooks/useSilo";
import Topbar from "@/components/layout/Topbar";
import MayaPanel from "@/components/maya/MayaPanel";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/portal", roles: ["Admin", "Staff", "Ops"] },
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
            padding: "10px 12px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: isActive ? 600 : 500,
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
    <div className="portal-layout">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <img src="/images/Header.png" alt="Boreal" style={{ height: 28, width: "auto" }} />
          <span>{String(silo ?? "BF").toUpperCase()}</span>
        </div>
        <NavContent />
      </aside>

      <div className="portal-layout__content">
        <Topbar onToggleSidebar={() => setMobileNavOpen((prev) => !prev)} onOpenMaya={() => setIsMayaOpen(true)} />
        <main className="portal-layout__main">
          <div className="portal-layout__inner">{children ?? <Outlet />}</div>
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
