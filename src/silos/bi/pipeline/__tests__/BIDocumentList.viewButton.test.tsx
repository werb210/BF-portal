import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BIDocumentList from "@/silos/bi/pipeline/BIDocumentList";

vi.mock("@/api", () => ({
  api: vi.fn(async () => [
    {
      id: "doc-1",
      doc_type: "id",
      original_filename: "passport.pdf",
      review_status: "pending",
      created_at: "2026-01-01T00:00:00.000Z",
      uploaded_by_actor: "client"
    }
  ])
}));

describe("BIDocumentList View button", () => {
  const originalFetch = global.fetch;
  const openMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    Object.defineProperty(window, "open", {
      writable: true,
      value: openMock
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("renders a View button for each document row", async () => {
    render(<BIDocumentList applicationId="app-1" />);
    expect(await screen.findByText("passport.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
  });

  it("calls file-url endpoint and opens returned URL", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://example.com/signed-url" })
    });

    render(<BIDocumentList applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "View" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/v1/bi/documents/doc-1/file-url", {
        credentials: "include",
        headers: { Accept: "application/json" }
      });
      expect(openMock).toHaveBeenCalledWith("https://example.com/signed-url", "_blank", "noopener,noreferrer");
    });
  });

  it("shows an error on non-OK response", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500
    });

    render(<BIDocumentList applicationId="app-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "View" }));

    expect(await screen.findByText("Could not load passport.pdf: 500")).toBeInTheDocument();
  });
});
