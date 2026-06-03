// BF_PORTAL_BLOCK_v312_COMPOSER_PULLDOWNS_v1 — template + collateral pulldowns,
// side by side, shown above the SMS and Messages composers. Mirrors the data
// sources the O365 email composer already uses (/api/templates, /api/collateral).
// Each select acts as an insert-menu: picking appends text to the message via
// onInsertText (template body, or collateral share link) and resets itself.
import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";

type ComposeTemplate = {
  id: string;
  name: string;
  subject?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  is_active?: boolean | null;
};

type CollateralOption = {
  id: string;
  name: string;
  url?: string | null;
  description?: string | null;
  is_active?: boolean | null;
};

function normalizeItems<T extends { id: string }>(value: unknown): T[] {
  const maybeItems = value && typeof value === "object" && "items" in value ? (value as { items?: unknown }).items : value;
  return Array.isArray(maybeItems)
    ? maybeItems.filter((item): item is T => Boolean(item && typeof item === "object" && typeof (item as T).id === "string"))
    : [];
}

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

const selectStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#334155",
};

export default function ComposerPulldowns({ onInsertText }: { onInsertText: (text: string) => void }) {
  const [templates, setTemplates] = useState<ComposeTemplate[]>([]);
  const [collateral, setCollateral] = useState<CollateralOption[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [collateralId, setCollateralId] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [templateResult, collateralResult] = await Promise.allSettled([
        api<unknown>("/api/templates"),
        api<unknown>("/api/collateral"),
      ]);
      if (!alive) return;
      if (templateResult.status === "fulfilled") {
        setTemplates(normalizeItems<ComposeTemplate>(templateResult.value).filter((item) => item.is_active !== false));
      }
      if (collateralResult.status === "fulfilled") {
        setCollateral(normalizeItems<CollateralOption>(collateralResult.value).filter((item) => item.is_active !== false));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (templates.length === 0 && collateral.length === 0) return null;

  function pickTemplate(id: string) {
    setTemplateId("");
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    const body = template.body_text ?? (template.body_html ? stripHtml(template.body_html) : "");
    if (body) onInsertText(body);
  }

  function pickCollateral(id: string) {
    setCollateralId("");
    const item = collateral.find((entry) => entry.id === id);
    if (!item) return;
    onInsertText(item.url ? item.url : item.name);
  }

  return (
    <div style={{ display: "flex", gap: 8, padding: "6px 16px", borderTop: "1px solid #f0f0f5", background: "#fff" }}>
      <select
        aria-label="Insert template"
        value={templateId}
        onChange={(event) => pickTemplate(event.target.value)}
        disabled={templates.length === 0}
        style={selectStyle}
      >
        <option value="">Template…</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>{template.name}</option>
        ))}
      </select>
      <select
        aria-label="Insert collateral"
        value={collateralId}
        onChange={(event) => pickCollateral(event.target.value)}
        disabled={collateral.length === 0}
        style={selectStyle}
      >
        <option value="">Collateral…</option>
        {collateral.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
    </div>
  );
}
