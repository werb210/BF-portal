// BF_PORTAL_SPLIT_VIEW_v205
// Document review beside the application instead of on top of it.
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_PANE = 320;
const DEFAULT_WIDTH = 560;
const STORAGE_KEY = "boreal.splitview.width";

export type SplitViewDoc = {
  url: string;
  filename: string | null;
  mimeType?: string | null;
};

type Props = {
  doc: SplitViewDoc | null;
  onClose: () => void;
};

function readStoredWidth(): number {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const width = raw ? Number(raw) : NaN;
    return Number.isFinite(width) && width >= MIN_PANE ? width : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

export default function DocumentSplitView({ doc, onClose }: Props) {
  const [width, setWidth] = useState<number>(readStoredWidth);
  const dragging = useRef(false);

  useEffect(() => {
    if (!doc) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, onClose]);

  const onMove = useCallback((event: MouseEvent) => {
    if (!dragging.current) return;
    // Keep both the document and application panes usable while resizing.
    const next = Math.min(
      Math.max(window.innerWidth - event.clientX, MIN_PANE),
      Math.max(window.innerWidth - MIN_PANE, MIN_PANE),
    );
    setWidth(next);
  }, []);

  const onUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    setWidth((currentWidth) => {
      try {
        sessionStorage.setItem(STORAGE_KEY, String(currentWidth));
      } catch {
        // Storage can be unavailable in privacy modes; resizing still works.
      }
      return currentWidth;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Never leave the page unselectable if this unmounts mid-drag.
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [onMove, onUp]);

  if (!doc) return null;

  return (
    <div
      data-testid="document-split-view"
      style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width,
        background: "#fff", borderLeft: "1px solid #e5e7eb",
        boxShadow: "-2px 0 12px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column", zIndex: 40,
      }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize document pane"
        onMouseDown={() => {
          dragging.current = true;
          document.body.style.userSelect = "none";
          document.body.style.cursor = "col-resize";
        }}
        style={{
          position: "absolute", left: -3, top: 0, bottom: 0, width: 6,
          cursor: "col-resize", background: "transparent",
        }}
      />

      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderBottom: "1px solid #e5e7eb", flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 14, fontWeight: 600, color: "#111827",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
          title={doc.filename ?? undefined}
        >
          {doc.filename ?? "Document"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13, color: "var(--ui-accent-blue)", textDecoration: "none",
              padding: "4px 8px",
            }}
          >
            Open in tab
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document"
            style={{
              border: "none", background: "transparent", cursor: "pointer",
              fontSize: 18, lineHeight: 1, color: "#6b7280", padding: "2px 8px",
            }}
          >
            ×
          </button>
        </div>
      </div>

      <object
        data={doc.url}
        type={doc.mimeType ?? undefined}
        style={{ flex: 1, width: "100%", border: "none" }}
      >
        <div style={{ padding: 20, fontSize: 14, color: "#6b7280" }}>
          This file type cannot be shown here.{" "}
          <a href={doc.url} target="_blank" rel="noopener noreferrer">Open it in a new tab</a>.
        </div>
      </object>
    </div>
  );
}
