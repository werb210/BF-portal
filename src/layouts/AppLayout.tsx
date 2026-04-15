import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useSilo } from "@/hooks/useSilo";
import Topbar from "@/components/layout/Topbar";
import MayaPanel from "@/components/maya/MayaPanel";

const NAV_SECTIONS = [
  {
    items: [
      { label: "Dashboard", path: "/portal" },
      { label: "Applications", path: "/applications", roles: ["Admin", "Staff"] },
      { label: "Pipeline", path: "/pipeline", roles: ["Admin", "Staff", "Ops"] },
      { label: "CRM", path: "/crm", roles: ["Admin", "Staff"] },
      { label: "Leads", path: "/leads", roles: ["Admin", "Staff"] },
      { label: "Communications", path: "/communications", roles: ["Admin", "Staff"] },
      { label: "Readiness Leads", path: "/portal/readiness", roles: ["Admin", "Staff"] },
      { label: "Capital Readiness", path: "/continuations", roles: ["Admin", "Staff"] },
      { label: "Live Chat", path: "/chat", roles: ["Admin", "Staff"] },
      { label: "AI Chat", path: "/ai-chat", roles: ["Admin", "Staff"] },
      { label: "Issues", path: "/issues", roles: ["Admin", "Staff"] },
      { label: "Calendar", path: "/calendar" },
      { label: "Marketing", path: "/marketing", roles: ["Admin", "Staff", "Ops"] },
      { label: "Lenders", path: "/lenders" },
      { label: "Settings", path: "/settings" }
    ]
  },
  {
    title: "Admin",
    items: [
      { label: "AI Knowledge", path: "/admin/ai", roles: ["Admin"] },
      { label: "Support", path: "/admin/support", roles: ["Admin"] },
      { label: "Analytics", path: "/admin/analytics", roles: ["Admin"] },
      { label: "Website Leads", path: "/admin/website-leads", roles: ["Admin"] },
      { label: "Issue Reports", path: "/admin/issue-reports", roles: ["Admin"] },
      { label: "Live Chat Queue", path: "/admin/live-chat", roles: ["Admin"] },
      { label: "Conversions", path: "/admin/conversions", roles: ["Admin"] },
      { label: "AI Policy", path: "/admin/ai-policy", roles: ["Admin"] },
      { label: "Operations", path: "/admin/operations", roles: ["Admin"] },
      { label: "Maya Intelligence", path: "/admin/maya", roles: ["Admin"] }
    ]
  }
] as const;

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const [isMayaOpen, setIsMayaOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user } = useAuth();
  const { silo } = useSilo();
  const role = (user as { role?: string } | null)?.role?.toLowerCase();
  const isStaff = role === "admin" || role === "staff";

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!isStaff) return false;
      if (!("roles" in item) || !item.roles) return true;
      return item.roles.some((r) => r.toLowerCase() === role);
    })
  })).filter((section) => section.items.length > 0);

  const NavContent = () => (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto" }}>
      {visibleSections.map((section) => (
        <div key={"title" in section && section.title ? section.title : "main"} style={{ marginBottom: 16 }}>
          {"title" in section && section.title && (
            <p
              style={{
                padding: "0 12px 6px",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--ui-text-muted)"
              }}
            >
              {section.title}
            </p>
          )}
          {section.items.map((item) => (
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
        </div>
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
