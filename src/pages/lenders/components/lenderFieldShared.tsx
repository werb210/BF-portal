// LENDER_FIELD_SHARED_v1 - Field wrapper + input style extracted from
// CreateLenderModal so the lender self-service profile form reuses the exact
// same staff field markup instead of a bare copy.
import React from "react";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--ui-border)",
  borderRadius: 6,
  fontSize: 14,
};

export function Field(p: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="ui-field" style={{ marginBottom: 12 }}>
      {p.label ? (
        <label className="ui-field__label" style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
          {p.label}
        </label>
      ) : null}
      {p.children}
      {p.error ? (
        <div className="ui-field__error" style={{ color: "#b91c1c", fontSize: 12, marginTop: 2 }}>
          {p.error}
        </div>
      ) : null}
    </div>
  );
}
