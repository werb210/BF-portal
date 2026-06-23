import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function SecondaryButton(props: Props) {
  return (
    <button
      type="button"
      {...props}
      style={{
        background: "var(--ui-surface-strong)",
        color: "var(--ui-text)",
        border: "1px solid var(--ui-border)",
        padding: "8px 14px",
        borderRadius: 8,
        fontWeight: 500,
        ...(props.style ?? {}),
      }}
    />
  );
}
