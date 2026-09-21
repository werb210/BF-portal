// BF_PORTAL_SPLIT_VIEW_v205
// BF_PORTAL_PREVIEW_ZOOM_v369 - zoom in/out, full screen with the review bar
// still showing, and "Move to" beside Reject so staff can view, move and
// accept without leaving the preview.
// Document review beside the application instead of on top of it.
import { useCallback, useEffect, useRef, useState } from "react";
import PdfPages, { looksLikeImage, looksLikePdf } from "./PdfPages";

const MIN_PANE = 320;
const DEFAULT_WIDTH = 560;
const STORAGE_KEY = "boreal.splitview.width";
const FULL_WIDTH_BELOW = 900;
const ZOOM_KEY = "boreal.splitview.zoom";
const FULL_KEY = "boreal.splitview.full";
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;

export function stepZoom(current: number, direction: 1 | -1): number {
  const next = Math.round((current + direction * ZOOM_STEP) * 100) / 100;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
}
function readStoredZoom(): number {
  try { const value = Number(sessionStorage.getItem(ZOOM_KEY)); return Number.isFinite(value) && value >= ZOOM_MIN && value <= ZOOM_MAX ? value : 1; } catch { return 1; }
}
function readStoredFull(): boolean {
  try { return sessionStorage.getItem(FULL_KEY) === "1"; } catch { return false; }
}

export type SplitViewDoc = {
  url: string;
  filename: string | null;
  mimeType?: string | null;
  blob?: Blob | null;
  documentId?: string | null;
  status?: string | null;
  category?: string | null;
  notices?: string[]; // BF_PORTAL_TAMPER_BADGES_v270
};

export type SplitViewReview = {
  working: "accept" | "reject" | undefined;
  onAccept: () => void;
  onReject: (reason: string) => void;
  onNext?: () => void;
  hasNext: boolean;
  moveTargets?: string[];
  onMove?: (category: string) => void;
};

type Props = {
  doc: SplitViewDoc | null;
  onClose: () => void;
  review?: SplitViewReview | null;
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

export default function DocumentSplitView({ doc, onClose, review }: Props) {
  const [width, setWidth] = useState<number>(readStoredWidth);
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < FULL_WIDTH_BELOW,
  );
  const [pdfHead, setPdfHead] = useState<Uint8Array>();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const dragging = useRef(false);
  const [zoom, setZoom] = useState<number>(readStoredZoom);
  const [expanded, setExpanded] = useState<boolean>(readStoredFull);

  useEffect(() => {
    try {
      sessionStorage.setItem(ZOOM_KEY, String(zoom));
      sessionStorage.setItem(FULL_KEY, expanded ? "1" : "0");
    } catch {
      // Storage can be unavailable in privacy modes; zoom still works.
    }
  }, [zoom, expanded]);

  useEffect(() => {
    if (!doc) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Leave full screen first; a second Escape closes the preview.
        if (expanded) setExpanded(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, onClose, expanded]);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < FULL_WIDTH_BELOW);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setRejecting(false);
    setReason("");
    setPdfHead(undefined);
    let cancelled = false;
    if (doc?.blob)
      void doc.blob
        .slice(0, 4)
        .arrayBuffer()
        .then((value) => {
          if (!cancelled) setPdfHead(new Uint8Array(value));
        });
    return () => {
      cancelled = true;
    };
  }, [doc?.url, doc?.blob]);

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
  const isPdf = !!doc.blob && looksLikePdf(doc.mimeType, doc.filename, pdfHead);
  const isImage = !isPdf && looksLikeImage(doc.mimeType, doc.filename);
  const status = String(doc.status ?? "pending").toLowerCase();
  const button = {
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  } as const;
  const tool = {
    minWidth: 40, minHeight: 36, padding: "0 10px", borderRadius: 8,
    border: "1px solid #d1d5db", background: "#fff", color: "#111827",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
  } as const;
  const moveTargets = review?.moveTargets ?? [];

  return (
    <div
      data-testid="document-split-view"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: narrow || expanded ? "100%" : width,
        background: "#fff",
        borderLeft: "1px solid #e5e7eb",
        boxShadow: "-2px 0 12px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
      }}
    >
      {!narrow && !expanded ? (
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
            position: "absolute",
            left: -3,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: "col-resize",
            background: "transparent",
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={doc.filename ?? undefined}
          >
            {doc.filename ?? "Document"}
          </div>
          {doc.category ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>{doc.category}</div>
          ) : null}
          {(doc.notices ?? []).map((notice) => (
            <div key={notice} data-testid="split-view-notice" style={{ fontSize: 12, fontWeight: 600, color: notice.startsWith("⚠") ? "#92400e" : "#1e40af", marginTop: 2 }}>
              {notice}
            </div>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {isPdf || isImage ? (
            <div role="group" aria-label="Zoom" style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button type="button" data-testid="zoom-out" aria-label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((current) => stepZoom(current, -1))} style={{ ...tool, opacity: zoom <= ZOOM_MIN ? 0.4 : 1 }}>−</button>
              <button type="button" data-testid="zoom-reset" aria-label="Reset zoom" onClick={() => setZoom(1)} style={{ ...tool, minWidth: 64, fontSize: 13 }}>{Math.round(zoom * 100)}%</button>
              <button type="button" data-testid="zoom-in" aria-label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((current) => stepZoom(current, 1))} style={{ ...tool, opacity: zoom >= ZOOM_MAX ? 0.4 : 1 }}>+</button>
            </div>
          ) : null}
          {!narrow ? <button type="button" data-testid="full-screen" aria-pressed={expanded} onClick={() => setExpanded((current) => !current)} style={{ ...tool, fontSize: 13 }}>{expanded ? "Exit full screen" : "Full screen"}</button> : null}
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              color: "var(--ui-accent-blue)",
              textDecoration: "none",
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
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              color: "#6b7280",
              padding: "2px 8px",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {isPdf && doc.blob ? (
        <PdfPages blob={doc.blob} zoom={zoom} fitKey={narrow || expanded ? "full" : "pane"} />
      ) : isImage ? (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "#f3f4f6",
            padding: 12,
          }}
        >
          <img
            src={doc.url}
            alt={doc.filename ?? "Document"}
            style={{ width: zoom === 1 ? undefined : `${Math.round(zoom * 100)}%`, maxWidth: zoom === 1 ? "100%" : "none", display: "block", margin: "0 auto" }}
          />
        </div>
      ) : (
        <div style={{ padding: 20, fontSize: 14, color: "#6b7280" }}>
          This file type cannot be shown here.{" "}
          <a href={doc.url} target="_blank" rel="noopener noreferrer">
            Open it in a new tab
          </a>
          .
        </div>
      )}

      {review ? (
        <div
          data-testid="review-bar"
          style={{
            borderTop: "1px solid #e5e7eb",
            padding: 12,
            flexShrink: 0,
            background: "#fff",
          }}
        >
          {rejecting ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason the applicant will see (e.g. missing pages, wrong month)"
                rows={3}
                style={{
                  width: "100%",
                  fontSize: 15,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  boxSizing: "border-box",
                }}
                autoFocus
              />
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setRejecting(false);
                    setReason("");
                  }}
                  style={{
                    ...button,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    color: "#111827",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!reason.trim() || !!review.working}
                  onClick={() => review.onReject(reason.trim())}
                  style={{
                    ...button,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    opacity: !reason.trim() || review.working ? 0.6 : 1,
                  }}
                >
                  {review.working === "reject"
                    ? "Rejecting..."
                    : "Confirm reject"}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  textTransform: "capitalize",
                }}
              >
                Status: {status}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {review.hasNext && review.onNext ? (
                  <button
                    type="button"
                    onClick={review.onNext}
                    style={{
                      ...button,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#111827",
                    }}
                  >
                    Next ›
                  </button>
                ) : null}
                {review.onMove && moveTargets.length > 0 ? (
                  <select aria-label="Move to another category" data-testid="pane-move" value="" disabled={!!review.working} onChange={(event) => { if (event.target.value) review.onMove?.(event.target.value); }} style={{ minHeight: 44, padding: "0 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#111827", fontSize: 15, maxWidth: 220 }}>
                    <option value="">Move to…</option>
                    {moveTargets.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                ) : null}
                <button
                  type="button"
                  disabled={!!review.working}
                  onClick={() => setRejecting(true)}
                  style={{
                    ...button,
                    border: "1px solid #dc2626",
                    background: "#fff",
                    color: "#dc2626",
                  }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={!!review.working}
                  onClick={review.onAccept}
                  style={{
                    ...button,
                    border: "none",
                    background: "#16a34a",
                    color: "#fff",
                    opacity: review.working ? 0.6 : 1,
                  }}
                >
                  {review.working === "accept" ? "Accepting..." : "Accept"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
