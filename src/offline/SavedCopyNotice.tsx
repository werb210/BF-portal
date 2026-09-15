// BF_PORTAL_OFFLINE_READ_CACHE_v252
import { useEffect, useState } from "react";
import { SAVED_COPY_EVENT } from "./readCache";

export default function SavedCopyNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    window.addEventListener(SAVED_COPY_EVENT, show);
    window.addEventListener("online", hide);
    return () => {
      window.removeEventListener(SAVED_COPY_EVENT, show);
      window.removeEventListener("online", hide);
    };
  }, []);
  if (!visible) return null;
  return (
    <div data-testid="saved-copy-notice" role="status"
      style={{ position: "fixed", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 9001, background: "#7c2d12", color: "#fff", borderRadius: 999, padding: "6px 14px", fontSize: 12, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
      Offline - showing a saved copy. Changes need a connection.
    </div>
  );
}
