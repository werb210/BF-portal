// BF_PORTAL_v855_RETENTION - the lock shown in place of a Delete button while a record is kept on file.
// Dark text on a light amber tint: readable on the light and dark portal themes.
import type { CSSProperties } from "react";
import { lockLabel, lockMessage, type RetentionStatus } from "./retention";

const pill: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8,
  background: "#fef3c7", color: "#78350f", border: "1px solid #f59e0b", fontSize: 12, fontWeight: 600, lineHeight: "16px",
  whiteSpace: "nowrap",
};

export function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
    </svg>
  );
}

/** Renders nothing unless the record is locked. */
export default function RetentionLock({ status, style }: { status: RetentionStatus | null; style?: CSSProperties }) {
  if (!status?.locked) return null;
  return (
    <span data-testid="retention-lock" role="note" title={lockMessage(status)} aria-label={lockMessage(status)} style={{ ...pill, ...style }}>
      <LockIcon />
      {lockLabel(status)}
    </span>
  );
}
