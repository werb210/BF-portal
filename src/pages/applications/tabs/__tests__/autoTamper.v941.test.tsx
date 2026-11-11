// BF_PORTAL_v941_AUTO_TAMPER - every document row shows the automatic tamper scan; there is no manual scan button.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/api", () => ({
  api: Object.assign(vi.fn(), { get: h.get, post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }),
  apiBlob: vi.fn(), rawApiFetch: vi.fn(),
}));
vi.mock("@/utils/api", () => ({ apiBlob: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Staff" } }) }));

describe("automatic tamper scan on the Documents tab", () => {
  it("shows each file's scan result and no Scan for tampering button", async () => {
    h.get.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/fraud/applications/")) return { ok: true, checks: [], documents: [{ document_id: "d1", filename: "statement.pdf", category: "bank", tamper: { status: "ok", reasons: [] }, statement_math: { status: "ok", reasons: [] } }] };
      if (url.includes("/duplicates")) return [];
      return { documents: [{ documentId: "d1", filename: "statement.pdf", category: "6 months business banking statements", title: null, mimeType: "application/pdf", size: 1000, storageKey: null, createdAt: "2026-11-11T10:00:00Z", status: "pending" }] };
    });
    const { default: DocumentsTab } = await import("../DocumentsTab");
    render(<DocumentsTab applicationId="app-1" />);
    expect(await screen.findByTestId("row-tamper-chip")).toBeInTheDocument();
    expect(screen.queryByText("Scan for tampering")).toBeNull();
  });
});
