import { useEffect, type CSSProperties, type ReactNode } from "react";

export type PopupAction = { label: string; onClick: () => void; disabled?: boolean };

export function PopupShell(props: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  primaryAction?: PopupAction;
  width?: number;
}): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div onClick={props.onClose} style={overlay}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...panel, width: `min(${props.width ?? 560}px, 92vw)` }}
      >
        <div style={header}>
          <strong>{props.title}</strong>
          <button onClick={props.onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>
        <div style={body}>{props.children}</div>
        {props.primaryAction && (
          <div style={footer}>
            <button
              onClick={props.primaryAction.onClick}
              disabled={props.primaryAction.disabled}
              style={primaryBtn}
            >
              {props.primaryAction.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const popupInputStyle: CSSProperties = {
  width: "100%", padding: 8, border: "1px solid #cbd6e2", borderRadius: 4,
  background: "#fff", color: "#000", fontSize: 14, fontFamily: "inherit",
};

const overlay: CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
};
const panel: CSSProperties = {
  background: "#fff", color: "#000", maxHeight: "85vh",
  borderRadius: 8, display: "flex", flexDirection: "column",
  boxShadow: "0 16px 40px rgba(0,0,0,0.3)", overflow: "hidden",
};
const header: CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "12px 16px", background: "#33475b", color: "#fff",
};
const body: CSSProperties = { padding: 16, overflow: "auto", flex: 1 };
const footer: CSSProperties = { padding: 12, borderTop: "1px solid #eee", textAlign: "right" };
const closeBtn: CSSProperties = {
  background: "transparent", border: "none", color: "#fff",
  cursor: "pointer", fontSize: 20, lineHeight: 1,
};
const primaryBtn: CSSProperties = {
  background: "#0091ae", color: "#fff", border: "none",
  padding: "8px 16px", borderRadius: 4, cursor: "pointer",
};
