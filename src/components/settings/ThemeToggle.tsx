import { useState } from "react";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "@/theme/theme";

const OPTIONS: Array<{ value: ThemeChoice; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(getThemeChoice());
  const pick = (v: ThemeChoice) => { setChoice(v); setThemeChoice(v); };
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ui-text-muted)", marginBottom: 8 }}>Appearance</div>
      <div style={{ display: "inline-flex", border: "1px solid var(--ui-surface-muted)", borderRadius: 10, overflow: "hidden" }}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => pick(o.value)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: choice === o.value ? "var(--ui-accent-blue)" : "transparent",
              color: choice === o.value ? "#fff" : "var(--ui-text)",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
