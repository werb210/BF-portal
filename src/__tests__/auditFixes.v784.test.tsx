// BF_PORTAL_V784 - items 3, 5, 8 and 9 of the Oct 11 audit.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";

const { post, siloGet } = vi.hoisted(() => ({ post: vi.fn(), siloGet: vi.fn() }));
vi.mock("@/api", () => ({
  api: { post },
  apiForSilo: (silo: string) => ({ get: (path: string) => siloGet(silo, path) }),
}));

import GlobalAdmin from "@/pages/GlobalAdmin";
import CreditReadiness from "@/pages/CreditReadiness";

const read = (p: string) => readFileSync(p, "utf8");

describe("v784 audit fixes", () => {
  beforeEach(() => {
    post.mockReset();
    siloGet.mockReset();
  });

  it("3: Operations and Audit Events call /api/admin/*", () => {
    const ops = read("src/pages/admin/Operations.tsx");
    expect(ops).toContain('const API_PREFIX = "/api";');
    for (const p of ["/admin/contacts", "/admin/issues", "/admin/chats"]) {
      expect(ops).toContain("`${API_PREFIX}" + p + "`");
      expect(ops).not.toContain(`"${p}"`);
    }
    expect(ops).toContain("`${API_PREFIX}/admin/issues/${id}`");
    const audit = read("src/pages/AuditEvents.tsx");
    expect(audit).toContain("`/api/admin/audit/events${query}`");
    expect(audit).not.toContain("`/admin/audit/events");
  });

  it("5: Global Admin counts each source on its own and marks a failed one unavailable", async () => {
    siloGet.mockImplementation(async (silo: string, path: string) => {
      if (silo === "BF" && path === "/api/portal/applications") return [{}, {}, {}];
      if (silo === "BI" && path === "/api/v1/bi/applications") throw new Error("BI down");
      if (silo === "SLF" && path === "/api/slf/deals") return { items: [{}, {}] };
      throw new Error("unexpected " + silo + " " + path);
    });
    render(<GlobalAdmin />);
    expect(await screen.findByText("BF applications count: 3")).toBeInTheDocument();
    expect(await screen.findByText("BI applications count: unavailable")).toBeInTheDocument();
    expect(await screen.findByText("SLF deal count: 2")).toBeInTheDocument();
  });

  it("8: Leads 'View Application' opens /applications/:id and the snapshot text is dark", () => {
    const leads = read("src/pages/admin/LeadsPage.tsx");
    expect(leads).toContain("href={`/applications/${selectedLead.linkedApplicationId}`}");
    expect(leads).not.toContain("/pipeline/${selectedLead.linkedApplicationId}");
    const snapshot = leads.slice(leads.indexOf("Credit Readiness Snapshot") - 400, leads.indexOf("View Application"));
    expect(snapshot).not.toMatch(/text-slate-(300|400)|text-blue-400/);
    expect(snapshot).toContain("text-slate-900");
    expect(snapshot).toContain("text-blue-700");
  });

  it("9: Credit Readiness posts the answers and shows the result with a copyable link", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    post.mockResolvedValue({ score: 72, tier: "green", applicationUrl: "https://client.example/apply?token=abc" });
    const { container } = render(<CreditReadiness />);
    fireEvent.change(screen.getByPlaceholderText("Company Name"), { target: { value: "Acme Ltd" } });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/website/credit-readiness", expect.objectContaining({ companyName: "Acme Ltd" })));
    expect(await screen.findByText("Score: 72")).toBeInTheDocument();
    expect(screen.getByText("Readiness: green")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://client.example/apply?token=abc" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://client.example/apply?token=abc"));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(read("src/pages/CreditReadiness.tsx")).not.toContain("/credit-results\")");
  });

  it("9: Credit Readiness shows an error when the submit fails", async () => {
    post.mockRejectedValue(new Error("Bad request"));
    const { container } = render(<CreditReadiness />);
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not submit: Bad request");
  });
});
