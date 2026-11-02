// BF_PORTAL_v864_LIBRARY_MENU - the Library "..." menu used to be absolutely positioned inside the file table, whose
// wrapper scrolls sideways (overflow-x: auto). That clipped the menu to the table: only two items showed, with a
// scrollbar, and the file row disappeared behind it. The menu now renders in a portal on document.body with fixed
// positioning, under the "..." button (or above it when there is no room below), kept inside the window, and it
// closes on Escape, scroll or resize.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type AnchorRect = { top: number; bottom: number; left: number; right: number };

const MARGIN = 8;

/** Where the menu goes: right-aligned to the button, below it, flipped above when it does not fit, clamped on screen. */
export function placeMenu(anchor: AnchorRect, size: { width: number; height: number }, viewport: { width: number; height: number }) {
  const maxHeight = Math.max(120, viewport.height - MARGIN * 2);
  const height = Math.min(size.height, maxHeight);
  let left = anchor.right - size.width;
  left = Math.min(left, viewport.width - size.width - MARGIN);
  left = Math.max(MARGIN, left);
  const below = anchor.bottom + 4;
  const above = anchor.top - 4 - height;
  let top: number;
  if (below + height <= viewport.height - MARGIN) top = below;
  else if (above >= MARGIN) top = above;
  else top = Math.max(MARGIN, viewport.height - MARGIN - height);
  return { top, left, maxHeight };
}

export function FloatingMenu(props: { anchor: AnchorRect; onClose: () => void; style?: CSSProperties; children: ReactNode; testId?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const { anchor, onClose } = props;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = rect.width || el.offsetWidth || 220;
    const height = el.scrollHeight || rect.height || 0;
    setPos(placeMenu(anchor, { width, height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [anchor]);

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    // Scrolling the page would leave a fixed menu floating away from its row.
    const onScroll = (e: Event) => { if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return; onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      role="menu"
      data-testid={props.testId}
      onClick={(e) => e.stopPropagation()}
      style={{
        ...props.style,
        position: "fixed",
        top: pos ? pos.top : anchor.bottom + 4,
        left: pos ? pos.left : Math.max(MARGIN, anchor.right - 220),
        maxHeight: pos ? pos.maxHeight : undefined,
        overflowY: "auto",
        zIndex: 1000,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {props.children}
    </div>,
    document.body,
  );
}
