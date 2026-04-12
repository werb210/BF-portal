import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside
        style={{
          width: "260px",
          background: "#111",
          color: "#fff",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "10px" }}>BF Portal</div>

        <a href="/dashboard">Dashboard</a>
        <a href="/applications">Applications</a>
        <a href="/leads">Leads</a>
        <a href="/capital">Capital</a>
        <a href="/readiness">Readiness</a>
        <a href="/chat">Live Chat</a>
        <a href="/comms">Comms</a>
        <a href="/calendar">Calendar</a>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
