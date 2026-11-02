// BF_PORTAL_v870_CRM_DATA_MODEL - Settings > Users & roles: the people (add, role, disable) and the roles (built-in templates
// and custom roles with their permission matrix).
import { useState } from "react";
import UserManagement from "@/pages/settings/tabs/UserManagement";
import RolesSettings from "./RolesSettings";

export default function UsersAndRoles() {
  const [view, setView] = useState<"people" | "roles">("people");
  const tab = (id: "people" | "roles", text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === id}
      onClick={() => setView(id)}
      style={{
        padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
        border: "1px solid var(--ui-border)",
        background: view === id ? "#1d4ed8" : "var(--ui-surface-strong)",
        color: view === id ? "#ffffff" : "var(--ui-text)",
      }}
    >
      {text}
    </button>
  );
  return (
    <div>
      <div role="tablist" aria-label="Users and roles" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tab("people", "People")}
        {tab("roles", "Roles")}
      </div>
      {view === "people" ? <UserManagement /> : <RolesSettings />}
    </div>
  );
}
