import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useSilo } from "@/hooks/useSilo";
import Topbar from "@/components/layout/Topbar";
import MayaChat from "@/components/maya/MayaChat";
import { useDialerStore } from "@/state/dialer.store";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/portal", roles: ["Admin", "Staff", "Ops"] },
  { label: "Pipeline", path: "/pipeline", roles: ["Admin", "Staff", "Ops"] },
  { label: "CRM", path: "/crm", roles: ["Admin", "Staff"] },
  { label: "Communications", path: "/communications", roles: ["Admin", "Staff"] },
  { label: "Calendar", path: "/calendar", roles: ["Admin", "Staff", "Ops"] },
  { label: "Marketing", path: "/marketing", roles: ["Admin"] },
  { label: "Lenders", path: "/lenders", roles: ["Admin", "Staff"] },
  { label: "Settings", path: "/settings", roles: ["Admin", "Staff", "Ops"] },
] as const;

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const [mayaOpen, setMayaOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();
  const { silo } = useSilo();
  const role = (user as { role?: string } | null)?.role;
  const openDialer = useDialerStore((state) => state.openDialer);

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.some((r) => r.toLowerCase() === role?.toLowerCase())
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
            transition: "background 0.15s",
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
          padding: "20px 12px 0",
          overflowY: "auto",
          boxShadow: "var(--ui-shadow-strong)",
          flexShrink: 0,
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
            gap: 8,
          }}
        >
          <img src="/images/Header.png" alt="Boreal" style={{ height: 28, width: "auto" }} />
          <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>
            {String(silo ?? "BF").toUpperCase()}
          </span>
        </div>

        <NavContent />

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setMayaOpen((prev) => !prev)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 4px",
              background: "none",
              border: "none",
              color: "var(--ui-text-muted)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            <span>MAYA</span>
            <span>{mayaOpen ? "▼" : "▲"}</span>
          </button>
          {mayaOpen && (
            <div style={{ paddingBottom: 12 }}>
              <MayaChat />
            </div>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar onToggleSidebar={() => setMobileNavOpen((prev) => !prev)} />
        <main style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--bg-primary)" }}>
          {children ?? <Outlet />}
        </main>
      </div>

      {mobileNavOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div
            style={{
              width: 260,
              background: "var(--ui-surface-strong)",
              padding: "20px 12px",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
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
                marginBottom: 16,
              }}
            >
              ×
            </button>
            <NavContent />
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileNavOpen(false)} />
        </div>
      )}

      <button
        type="button"
        onClick={() => openDialer({ source: "global" })}
        aria-label="Open dialer"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 100,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--color-primary, #2563eb)",
          color: "#fff",
          border: "none",
          fontSize: 22,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ☎︎
      </button>
    </div>
  );
}
