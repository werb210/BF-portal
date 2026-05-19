import React from "react";

export default function MarketingA() {
  return (
    <div>
      <h2>Marketing-A</h2>
      <p>Feature buildout in progress.</p>
      <section>
        <h3>Pipeline</h3>
        <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
          {["New Leads", "Engaged", "Qualified", "Hand-off to Sales"].map((col) => (
            <div key={col} style={{ minWidth: 200, padding: 12, border: "1px solid #2a2a2a", borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{col}</div>
              <div style={{ opacity: 0.6, fontSize: 13 }}>No leads yet</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ marginTop: 24 }}>
        <h3>Andrew's feature roadmap</h3>
        <ul>
          <li>Pipeline</li>
          <li>Sequences</li>
          <li>Reply tracking</li>
          <li>Mailbox health</li>
          <li>Lead scoring</li>
        </ul>
      </section>
    </div>
  );
}
