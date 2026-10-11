// BF_PORTAL_v786_WORKFLOW_BUILDER - "Create workflow" menu: From scratch, From template
// (library cards) and With AI (describe it in plain English; the draft opens in the editor, off).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PanelShell } from "./SidePanel";
import type { Silo } from "./types";
import { btn, input, muted, primary } from "./ui";
import { errorText, workflowApi, type LibraryItem } from "./workflowApi";

type Mode = null | "menu" | "template" | "ai";

export default function CreateWorkflowMenu({ silo = "BF" }: { silo?: Silo }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(null);
  const [library, setLibrary] = useState<LibraryItem[] | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = (id?: string) => navigate("/automations/" + (id ? encodeURIComponent(id) : "new" + (silo === "BI" ? "?silo=BI" : "")));

  const showTemplates = () => {
    setMode("template"); setError(null);
    if (library === null) workflowApi.library().then(setLibrary).catch((e) => { setLibrary([]); setError(errorText(e, "Could not load the templates.")); });
  };
  const pickTemplate = async (key: string) => {
    setBusy(true); setError(null);
    try { const w = await workflowApi.fromLibrary(key); if (w.id) open(w.id); else setError("The template was created but has no id."); }
    catch (e) { setError(errorText(e, "Could not create a workflow from that template.")); }
    finally { setBusy(false); }
  };
  const draft = async () => {
    if (!prompt.trim()) { setError("Describe what the workflow should do."); return; }
    setBusy(true); setError(null);
    try { const w = await workflowApi.draftFromText(prompt.trim(), silo); if (w.id) open(w.id); else setError("The draft was created but has no id."); }
    catch (e) { setError(errorText(e, "Could not draft a workflow from that description.")); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" style={primary} aria-haspopup="menu" aria-expanded={mode === "menu"} onClick={() => setMode(mode === "menu" ? null : "menu")}>Create workflow</button>
      {mode === "menu" && (
        <div role="menu" style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, zIndex: 40, minWidth: 220, background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8, boxShadow: "var(--ui-shadow-strong)", overflow: "hidden" }}>
          {([["From scratch", () => open()], ["From template", showTemplates], ["With AI", () => { setMode("ai"); setError(null); }]] as Array<[string, () => void]>).map(([text, onClick]) => (
            <button key={text} type="button" role="menuitem" onClick={onClick} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", color: "var(--ui-text)", cursor: "pointer", fontSize: 14 }}>{text}</button>
          ))}
        </div>
      )}
      {(mode === "template" || mode === "ai") && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(11,31,58,0.35)" }}>
          {mode === "template" ? (
            <PanelShell testId="template-panel" title="Start from a template" onClose={() => setMode(null)}>
              {library === null ? <div style={muted}>Loading templates...</div> : library.length === 0 && !error ? <div style={muted}>No templates yet.</div> : (
                <div style={{ display: "grid", gap: 10 }}>
                  {library.map((item) => (
                    <div key={item.key} data-testid="library-card" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 12, color: "var(--ui-text)" }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.name}</div>
                      {item.category && <div style={{ ...muted, marginBottom: 4 }}>{item.category}</div>}
                      <div style={{ fontSize: 13, marginBottom: 8 }}>{item.description}</div>
                      <button type="button" style={btn} disabled={busy} onClick={() => void pickTemplate(item.key)}>Use template</button>
                    </div>
                  ))}
                </div>
              )}
              {error && <div role="alert" style={{ color: "var(--wf-danger)", fontSize: 13, marginTop: 10 }}>{error}</div>}
            </PanelShell>
          ) : (
            <PanelShell testId="ai-panel" title="Create with AI" onClose={() => setMode(null)} footer={<>
              <button type="button" style={btn} onClick={() => setMode(null)}>Cancel</button>
              <button type="button" style={primary} disabled={busy} onClick={() => void draft()}>{busy ? "Drafting..." : "Draft workflow"}</button>
            </>}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ui-text)", marginBottom: 6 }} htmlFor="wf-ai-prompt">Describe the workflow in plain English</label>
              <textarea id="wf-ai-prompt" aria-label="Describe the workflow" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={7} placeholder="For example: when a new lead comes in from the website, text them a welcome, wait 2 days, and if they have not booked a call, create a call task for the owner." style={{ ...input, width: "100%", boxSizing: "border-box", fontFamily: "inherit" }} />
              <div style={{ ...muted, marginTop: 8 }}>The draft opens in the editor turned off, so you can review every step before switching it on.</div>
              {error && <div role="alert" style={{ color: "var(--wf-danger)", fontSize: 13, marginTop: 10 }}>{error}</div>}
            </PanelShell>
          )}
        </div>
      )}
    </div>
  );
}
