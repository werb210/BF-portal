// BF_PORTAL_v864_PORTAL_FIXES - sentinel for the v864 portal fixes block.
// BF_PORTAL_v864_CONTENT_TAB - Settings > Content: everything staff write or reuse, in one place.
// Templates, Snippets, Collateral and the Library were separate Settings tabs and the automations sat under
// Marketing > Automations (and /admin/automations). They are now sections of this one tab, chosen with
// ?section=templates|snippets|collateral|library|automations. The old addresses (/settings/templates,
// /settings/library, /library, /marketing?tab=automations, /admin/automations) all forward here.
import { useMemo, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TemplatesSettings from "./TemplatesSettings";
import SnippetsSettings from "./SnippetsSettings";
import CollateralSettings from "./CollateralSettings";
import LibraryPage from "@/pages/library/LibraryPage";
import AutomationsBuilder from "@/pages/admin/AutomationsPage";
import AutomationsSystemRules from "@/pages/marketing/AutomationsSystemRules";

export type ContentSectionId = "templates" | "snippets" | "collateral" | "library" | "automations";
export const CONTENT_SECTION_IDS: readonly ContentSectionId[] = ["templates", "snippets", "collateral", "library", "automations"];

export function isContentSection(value: unknown): value is ContentSectionId {
  return typeof value === "string" && (CONTENT_SECTION_IDS as readonly string[]).includes(value);
}

type Section = { id: ContentSectionId; label: string; visible: boolean; render: () => ReactNode };

// canAutomate: Admin and Marketing, the roles that had Marketing > Automations and /admin/automations.
export default function ContentSettings({ isBI = false, canAutomate = false }: { isBI?: boolean; canAutomate?: boolean }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sections = useMemo<Section[]>(
    () => [
      { id: "templates", label: "Templates", visible: !isBI, render: () => <TemplatesSettings /> },
      // Snippets work in BI too (#pnw on a PGI conversation); the server scopes them by silo.
      { id: "snippets", label: "Snippets", visible: true, render: () => <SnippetsSettings /> },
      { id: "collateral", label: "Collateral", visible: !isBI, render: () => <CollateralSettings /> },
      { id: "library", label: "Library", visible: true, render: () => <LibraryPage /> },
      { id: "automations", label: "Automations", visible: !isBI && canAutomate, render: () => (<><AutomationsBuilder /><AutomationsSystemRules /></>) },
    ],
    [isBI, canAutomate],
  );
  const shown = sections.filter((s) => s.visible);
  const wanted = params.get("section");
  const active = shown.find((s) => s.id === wanted) ?? shown[0];

  return (
    <div data-testid="content-settings">
      <div role="tablist" aria-label="Content sections" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {shown.map((s) => {
          const on = s.id === active?.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => navigate(`/settings/content?section=${s.id}`)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid " + (on ? "var(--ui-accent-blue, #1d4ed8)" : "var(--ui-border, #cbd6e2)"),
                background: on ? "var(--ui-accent-blue, #1d4ed8)" : "transparent",
                color: on ? "#fff" : "var(--ui-text, #0f172a)",
                fontWeight: on ? 600 : 500,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" aria-label={active?.label}>{active?.render()}</div>
    </div>
  );
}
