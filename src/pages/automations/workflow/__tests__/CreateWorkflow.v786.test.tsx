// BF_PORTAL_v786_WORKFLOW_BUILDER - the automations list and its Create workflow menu:
// From scratch, From template (library) and With AI (draft opens in the editor, off).
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ post: [] as Array<[string, any]>, patch: [] as Array<[string, any]> }));
vi.mock("@/api", () => {
  const get = vi.fn(async (url: string) => {
    if (url === "/api/automations/catalog") return { triggers: [{ key: "contact.created", label: "Contact is created" }] };
    if (url === "/api/automations") return [
      { id: "w1", name: "New lead nurture", silo: "BF", enabled: true, active_count: 3, total_count: 9, graph: { triggers: [{ type: "contact.created", filters: [], filterLogic: "all" }], startNodeId: "a", nodes: { a: { kind: "action", action: "add_note", params: { body: "x" }, next: null } } } },
    ];
    if (url === "/api/automations/library") return [
      { key: "new_lead", name: "New lead follow-up", description: "Text and task for every new lead", category: "Leads" },
      { key: "missed_call", name: "Missed call text back", description: "Text people whose call we missed" },
    ];
    return [];
  });
  const post = vi.fn(async (url: string, body: any) => {
    calls.post.push([url, body]);
    if (url === "/api/automations/from-library") return { id: "w9", name: "New lead follow-up", enabled: false };
    if (url === "/api/automations/draft-from-text") return { id: "w10", name: "AI draft", enabled: false };
    return {};
  });
  const patch = vi.fn(async (url: string, body: any) => { calls.patch.push([url, body]); return {}; });
  return { api: Object.assign(get, { get, post, patch, delete: vi.fn(async () => ({})) }) };
});

import AutomationsPage from "@/pages/admin/AutomationsPage";

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname + l.search}</div>; }
function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/automations"]}>
      <Routes>
        <Route path="/admin/automations" element={<AutomationsPage />} />
        <Route path="/automations/:id" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { calls.post.length = 0; calls.patch.length = 0; });

describe("Automations list and Create workflow menu", () => {
  it("lists workflows with their trigger and opens one in the editor", async () => {
    renderPage();
    const row = await screen.findByTestId("automation-rule");
    expect(row).toHaveTextContent("New lead nurture");
    expect(row).toHaveTextContent("3 running - 9 total");
    await waitFor(() => expect(row).toHaveTextContent("When Contact is created - 1 step"));
    fireEvent.click(within(row).getByRole("button", { name: "Turn off" }));
    await waitFor(() => expect(calls.patch).toContainEqual(["/api/automations/w1", { enabled: false }]));
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/automations/w1");
  });

  it("From scratch opens a new workflow", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Create workflow" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "From scratch" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/automations/new");
  });

  it("From template shows library cards and creates from one", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Create workflow" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "From template" }));
    const cards = await screen.findAllByTestId("library-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Text and task for every new lead");
    fireEvent.click(within(cards[0]!).getByRole("button", { name: "Use template" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/automations/w9"));
    expect(calls.post).toContainEqual(["/api/automations/from-library", { key: "new_lead" }]);
  });

  it("With AI drafts from a plain-English description and opens the draft", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Create workflow" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "With AI" }));
    const panel = screen.getByTestId("ai-panel");
    fireEvent.click(within(panel).getByRole("button", { name: "Draft workflow" }));
    expect(within(panel).getByRole("alert")).toHaveTextContent("Describe what the workflow should do.");
    fireEvent.change(within(panel).getByLabelText("Describe the workflow"), { target: { value: "Text new leads, wait 2 days, then create a call task" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Draft workflow" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/automations/w10"));
    expect(calls.post).toContainEqual(["/api/automations/draft-from-text", { prompt: "Text new leads, wait 2 days, then create a call task", silo: "BF" }]);
    expect(calls.patch).toEqual([]);
  });
});
