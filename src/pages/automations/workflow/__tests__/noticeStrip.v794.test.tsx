// BF_PORTAL_v794_NOTICE_STRIP
// The notice strip above the canvas is always rendered at a fixed height, so showing "Saved."
// (or the move prompt) never shifts the canvas and the cards under the pointer.
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { emptyWorkflow } from "../types";

vi.mock("../workflowApi", async (orig) => {
  const real = await orig<typeof import("../workflowApi")>();
  const { emptyWorkflow: empty } = await import("../types");
  return {
    ...real,
    workflowApi: {
      ...real.workflowApi,
      catalog: vi.fn().mockResolvedValue({ triggers: [], actions: [], fields: [], operators: [], templates: { email: [], sms: [] }, stages: [], events: [], tokens: [] }),
      users: vi.fn().mockResolvedValue([]),
      lists: vi.fn().mockResolvedValue([]),
      workflows: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue({ ...empty("BF"), id: "wf1", name: "Strip test" }),
      validate: vi.fn().mockResolvedValue([]),
    },
  };
});

import WorkflowEditor from "../WorkflowEditor";

class NoopResizeObserver { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal("ResizeObserver", NoopResizeObserver);

describe("workflow editor notice strip", () => {
  it("is present at a fixed height before any message appears", async () => {
    expect(emptyWorkflow("BF").enabled).toBe(false);
    render(<MemoryRouter initialEntries={["/automations/wf1"]}><Routes><Route path="/automations/:id" element={<WorkflowEditor />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("workflow-name")).toHaveTextContent("Strip test"));
    const strip = screen.getByTestId("editor-notices");
    expect(strip.style.height).toBe("36px");
    expect(strip.style.flexShrink).toBe("0");
    expect(screen.queryByTestId("editor-message")).toBeNull();
  });
});
