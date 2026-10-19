// BF_PORTAL_v828_PARTNER_PORTAL_THEME - the styled upload box used across the partner portals instead of the native
// "Choose File" button. Tap to pick (iPad), or drop files on it (desktop).
import { useState } from "react";
import "./partnerPortal.css";

type Props = {
  label: string;
  title: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  inputRef?: React.Ref<HTMLInputElement>;
};

export default function FileDrop({ label, title, hint, accept, multiple, disabled, onFiles, inputRef }: Props) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`pp-drop${over ? " pp-drop--over" : ""}${disabled ? " pp-drop--disabled" : ""}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) onFiles(Array.from(e.dataTransfer?.files ?? [])); }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" style={{ color: "var(--pp-accent-fg)" }}>
        <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="pp-drop__title">{title}</span>
      {hint ? <span className="pp-drop__hint">{hint}</span> : null}
      <input
        ref={inputRef}
        type="file"
        aria-label={label}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => { const list = Array.from(e.target.files ?? []); if (list.length) onFiles(list); e.target.value = ""; }}
      />
    </div>
  );
}
