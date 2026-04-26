import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function SecondaryButton(props: Props) {
  return (
    <button
      type="button"
      {...props}
      style={{
        background: "#fff",
        color: "#000",
        border: "1px solid #d1d5db",
        padding: "8px 14px",
        borderRadius: 8,
        fontWeight: 500,
        ...(props.style ?? {}),
      }}
    />
  );
}
