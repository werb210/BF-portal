// BF_PORTAL_DOCUMENT_REVIEW_PANE_v261
// Render downloaded PDF bytes to canvases so previews work with the portal CSP
// and in the iPad app, where embedded PDF objects only show the first page.
import { useEffect, useRef, useState } from "react";

export const MAX_RENDERED_PAGES = 60;

export function looksLikePdf(
  mimeType: string | null | undefined,
  filename: string | null | undefined,
  head?: Uint8Array,
): boolean {
  if (String(mimeType ?? "").toLowerCase() === "application/pdf") return true;
  if (/\.pdf$/i.test(String(filename ?? ""))) return true;
  return (
    !!head &&
    head.length >= 4 &&
    head[0] === 0x25 &&
    head[1] === 0x50 &&
    head[2] === 0x44 &&
    head[3] === 0x46
  );
}

export function looksLikeImage(
  mimeType: string | null | undefined,
  filename: string | null | undefined,
): boolean {
  if (
    String(mimeType ?? "")
      .toLowerCase()
      .startsWith("image/")
  )
    return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(String(filename ?? ""));
}

export default function PdfPages({ blob }: { blob: Blob }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    pages: number;
    message?: string;
  }>({ status: "loading", pages: 0 });

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.js?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const data = new Uint8Array(await blob.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        const count = Math.min(pdf.numPages, MAX_RENDERED_PAGES);
        setState({ status: "ready", pages: pdf.numPages });
        const width = Math.max(280, host.clientWidth - 24);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= count; n += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: (width / base.width) * ratio,
          });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${width}px`;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 12px";
          canvas.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
          canvas.setAttribute("aria-label", `Page ${n}`);
          host.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;
        }
      } catch (error) {
        if (!cancelled)
          setState({
            status: "error",
            pages: 0,
            message:
              error instanceof Error
                ? error.message
                : "Could not read this PDF",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob]);

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        background: "#f3f4f6",
        padding: 12,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {state.status === "loading" ? (
        <div style={{ fontSize: 14, color: "#6b7280", padding: 8 }}>
          Loading document...
        </div>
      ) : null}
      {state.status === "error" ? (
        <div style={{ fontSize: 14, color: "#b91c1c", padding: 8 }}>
          This PDF could not be displayed ({state.message}). Use Open in tab.
        </div>
      ) : null}
      {state.status === "ready" && state.pages > MAX_RENDERED_PAGES ? (
        <div style={{ fontSize: 13, color: "#6b7280", padding: "0 0 8px" }}>
          Showing the first {MAX_RENDERED_PAGES} of {state.pages} pages. Use
          Open in tab for the rest.
        </div>
      ) : null}
      <div ref={hostRef} data-testid="pdf-pages" />
    </div>
  );
}
