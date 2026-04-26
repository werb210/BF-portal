import { useState, type CSSProperties } from "react";
import { canDelete } from "@/auth/canDelete";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => Promise<void> | void;
  saveLabel?: string;
  deleteLabel?: string;
  saveDisabled?: boolean;
  deleting?: boolean;
}

export default function ModalFooterWithDelete({
  onCancel,
  onSave,
  onDelete,
  saveLabel = "Save Changes",
  deleteLabel = "Delete",
  saveDisabled,
  deleting,
}: Props): JSX.Element {
  const { user } = useAuth();
  const showDelete = Boolean(onDelete) && canDelete(user?.role as any);
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={footer}>
      <div>
        {showDelete && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} style={dangerBtn}>
            {deleteLabel}
          </button>
        )}
        {showDelete && confirming && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#dc2626" }}>Are you sure?</span>
            <button
              type="button"
              onClick={async () => {
                if (onDelete) await onDelete();
              }}
              disabled={deleting}
              style={dangerBtnSolid}
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} style={ghostBtn}>
              No
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>
          Cancel
        </button>
        <button type="button" onClick={onSave} disabled={saveDisabled} style={primaryBtn}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

const footer: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderTop: "1px solid #eaf0f6",
  marginTop: 16,
};
const ghostBtn: CSSProperties = {
  padding: "8px 16px",
  background: "#fff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 4,
  cursor: "pointer",
};
const primaryBtn: CSSProperties = {
  padding: "8px 16px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};
const dangerBtn: CSSProperties = {
  padding: "8px 16px",
  background: "#fff",
  color: "#dc2626",
  border: "1px solid #dc2626",
  borderRadius: 4,
  cursor: "pointer",
};
const dangerBtnSolid: CSSProperties = {
  padding: "8px 16px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};
