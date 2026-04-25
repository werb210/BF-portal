import type { CSSProperties } from "react";
import type { Scope } from "@/api/crm";

type ActionBarProps = {
  scope: Scope;
  contactEmail?: string;
  contactPhone?: string;
  onChanged?: () => void;
};

const actions = ["Note", "Email", "Call", "SMS", "Task", "Meeting"] as const;

export function ActionBar({ onChanged }: ActionBarProps) {
  return (
    <div style={containerStyle}>
      {actions.map((label) => (
        <button
          key={label}
          type="button"
          style={buttonStyle}
          onClick={() => onChanged?.()}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 16,
};

const buttonStyle: CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #cbd6e2",
  background: "#fff",
  borderRadius: 4,
  cursor: "pointer",
};
