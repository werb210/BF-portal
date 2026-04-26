import { useEffect, useState, type CSSProperties } from "react";
import { useDialerStore } from "@/state/dialer.store";

export default function GlobalDialerButton(): JSX.Element | null {
  const openDialer = useDialerStore((s) => s.openDialer);
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const hasToken =
        Boolean(localStorage.getItem("bf_session")) ||
        document.cookie.includes("bf_session=");
      setAuthed(hasToken);
    } catch {
      setAuthed(true);
    }
  }, []);

  if (!authed) return null;

  return (
    <button
      type="button"
      onClick={() => openDialer({ source: "global" })}
      aria-label="Open dialer"
      title="Open dialer"
      style={fab}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>📞</span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>Dialer</span>
    </button>
  );
}

const fab: CSSProperties = {
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 2147483000,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  width: 64,
  height: 64,
  borderRadius: 32,
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
  padding: 0,
};
