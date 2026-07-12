// BF_PORTAL_BLOCK_v602_INBOUND_UI_v1
import React from "react";
import { useNavigate } from "react-router-dom";
import { useDialer } from "../store";
import { answerIncoming, declineIncoming } from "../actions";

export default function IncomingCallToast() {
  const incoming = useDialer((s) => s.incoming);
  // BF_PORTAL_TOAST_NO_RELOAD_v1 - these were anchor href links, i.e. a FULL page load.
  // That unmounts DialerProvider, which destroys the Twilio Device, which drops the
  // live call - so clicking "Open" on a ringing call hung up on the caller and sent
  // them to voicemail. Client-side navigation keeps the Device (and the call) alive.
  const navigate = useNavigate();
  if (!incoming) return null;
  return (
    <div role="alert" style={wrap}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 2 }}>Incoming call</div>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {incoming.fromDisplay || "Unknown caller"}
        </div>
        {incoming.phone && incoming.phone !== incoming.fromDisplay && (
          <div style={{ color: "#9ca3af", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{incoming.phone}</div>
        )}
      </div>
      {/* BF_PORTAL_UNKNOWN_CALLER_v1 - known -> Open; unknown -> Add to contacts */}
      {incoming.contactId ? (
        <button type="button" onClick={() => navigate(`/crm/contacts/${incoming.contactId}`)} style={btn("var(--ui-accent-blue)")}>Open</button>
      ) : incoming.phone ? (
        <button type="button" onClick={() => navigate(`/crm/contacts?addPhone=${encodeURIComponent(incoming.phone ?? "")}`)} style={btn("var(--ui-accent-blue)")}>Add</button>
      ) : null}
      <button onClick={() => declineIncoming()} style={btn("#374151")}>Dismiss</button>
      <button onClick={() => void answerIncoming()} style={btn("#22c55e")}>Answer</button>
    </div>
  );
}
const wrap: React.CSSProperties = {
  position: "fixed", top: 16, right: 16, width: 360, padding: 12, borderRadius: 12,
  background: "#0b1220", color: "#fff", border: "1px solid #1f2937",
  boxShadow: "0 12px 28px rgba(0,0,0,.4)", display: "flex", alignItems: "center", gap: 10, zIndex: 1001,
};
const btn = (bg: string): React.CSSProperties => ({
  background: bg, border: "none", color: "#fff", padding: "8px 14px",
  borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13,
});
