import { useEffect, useState, type CSSProperties } from "react";
import { useDialerStore } from "@/state/dialer.store";
import { getToken } from "@/auth/token";

export default function GlobalDialerButton(): JSX.Element | null {
  const openDialer = useDialerStore((s) => s.openDialer);
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    const check = () => setAuthed(Boolean(getToken()));
    check();
    // Re-check when token changes elsewhere (login/logout in another tab)
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes("auth")) check();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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
      <span style={{ fontSize: 20, lineHeight: 1 }}>📞</span>
      <span style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>Dialer</span>
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
