// BF_PORTAL_BLOCK_v89_LENDER_SPA_v1
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { lenderApi, type LenderMe } from "@/api/lenderApi";
import { clearAuthToken } from "@/lib/authToken";

export default function LenderLayout() {
  const nav = useNavigate();
  const [me, setMe] = useState<LenderMe | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    lenderApi.me()
      .then(setMe)
      .catch((e) => {
        if (e?.status === 401 || e?.status === 403) nav("/lender-portal/login", { replace: true });
        else setErr(e?.message ?? "Failed to load lender profile");
      });
  }, [nav]);

  function logout() {
    clearAuthToken();
    nav("/lender-portal/login", { replace: true });
  }

  if (err) return <div style={{ padding: 24, color: "#dc2626" }}>{err}</div>;
  if (!me) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div className="lender-layout" style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{ background: "#0f1d36", color: "#fff", padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: "0.08em" }}>LENDER PORTAL</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{me.lender?.name ?? "Your Lender"}</div>
        </div>
        <nav style={{ display: "grid", gap: 4 }}>
          {[
            { to: "/lender-portal/dashboard",   label: "Dashboard" },
            { to: "/lender-portal/applications", label: "Applications" },
            { to: "/lender-portal/products",     label: "Products" },
            { to: "/lender-portal/profile",      label: "Profile" },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: "10px 12px", borderRadius: 6, color: "#fff", textDecoration: "none",
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={logout} style={{ marginTop: 32, padding: "8px 12px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6 }}>
          Sign out
        </button>
      </aside>
      <main style={{ padding: 32, background: "#f8fafc" }}>
        <Outlet context={me} />
      </main>
    </div>
  );
}
