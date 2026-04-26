import { type CSSProperties, type ReactNode } from "react";

type FormFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

export default function FormField({ label, required = false, error, children }: FormFieldProps) {
  return (
    <label style={wrapper}>
      <span style={labelStyle}>
        {label}
        {required ? <span style={requiredStyle}> *</span> : null}
      </span>
      {children}
      {error ? <span style={errorStyle}>{error}</span> : null}
    </label>
  );
}

const wrapper: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 12,
};

const labelStyle: CSSProperties = {
  color: "#111827",
  fontSize: 13,
  fontWeight: 600,
};

const requiredStyle: CSSProperties = {
  color: "#dc2626",
};

const errorStyle: CSSProperties = {
  color: "#b00020",
  fontSize: 12,
};
