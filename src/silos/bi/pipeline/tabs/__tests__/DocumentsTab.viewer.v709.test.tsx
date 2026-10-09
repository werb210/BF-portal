// BF_PORTAL_BI_DOC_VIEWER_v709 - View opens the docked viewer, not a download.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", role: "Admin" } }) }));
const apiMock = vi.fn();
vi.mock("@/api", () => ({ api: (...args: unknown[]) => apiMock(...args), apiForSilo: () => vi.fn(async () => ({ ok: true })) }));
vi.mock("@/silos/bi/api/biRequiredDocs", () => ({ fetchRequiredDocs: vi.fn(async () => []) }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
import DocumentsTab from "../DocumentsTab";
describe("BI documents View", () => {
  beforeEach(() => { vi.clearAllMocks(); apiMock.mockResolvedValue({ documents: [{ id: "doc-1", doc_type: "profit_loss", file_name: "PnL.pdf", status: "pending" }] }); const pdf = new Blob(["%PDF-1.4 test"], { type: "application/octet-stream" }); vi.stubGlobal("fetch", vi.fn(async () => new Response(pdf, { status: 200 }))); if (!URL.createObjectURL) (URL as any).createObjectURL = () => "blob:test"; vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test"); (URL as any).revokeObjectURL = vi.fn(); });
  it("opens the docked viewer instead of a new tab that downloads", async () => { const open = vi.spyOn(window, "open").mockImplementation(() => null); render(<DocumentsTab applicationId="app-1" stage={"documents" as any} onMutated={() => {}} />); const btn = await screen.findByText("View"); fireEvent.click(btn); await waitFor(() => expect(screen.getByTestId("document-split-view")).toBeTruthy()); expect(open).not.toHaveBeenCalled(); }, 20000); // BF_PORTAL_DEPS_v779 - the viewer loads pdf.js lazily; 5 s timed out on a busy CI runner
});
