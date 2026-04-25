import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KnowledgeManager from "@/features/ai/KnowledgeManager";
import { api } from "@/api";

vi.mock("@/api", () => {
  const mockApi = Object.assign(vi.fn(), { post: vi.fn() });
  return { api: mockApi };
});

describe("KnowledgeManager", () => {
  const apiMock = vi.mocked(api);
  const postMock = vi.mocked(api.post);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders and calls /api/settings/ai-knowledge on mount", async () => {
    apiMock.mockResolvedValue({ documents: [] });

    render(<KnowledgeManager />);

    expect(screen.getByText("AI Knowledge Base")).toBeInTheDocument();
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith("/api/settings/ai-knowledge");
    });
  });

  it("submitting text fires POST /api/settings/ai-knowledge/text", async () => {
    const user = userEvent.setup();
    apiMock.mockResolvedValue({ documents: [] });
    postMock.mockResolvedValue({});

    render(<KnowledgeManager />);

    await screen.findByText("Indexed entries (0)");
    await user.type(screen.getByPlaceholderText("Title (optional)"), "Playbook");
    await user.type(screen.getByPlaceholderText("Paste reference content Maya should know about…"), "Useful text");
    await user.click(screen.getByRole("button", { name: "Add entry" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/api/settings/ai-knowledge/text", {
        content: "Useful text",
        title: "Playbook",
      });
    });
  });

  it("renders warning banner when save returns savedWithoutIndex", async () => {
    const user = userEvent.setup();
    apiMock.mockResolvedValue({ documents: [] });
    postMock.mockResolvedValue({ savedWithoutIndex: true, message: "Saved without embeddings." });

    render(<KnowledgeManager />);

    await screen.findByText("Indexed entries (0)");
    await user.type(screen.getByPlaceholderText("Paste reference content Maya should know about…"), "Useful text");
    await user.click(screen.getByRole("button", { name: "Add entry" }));

    expect(await screen.findByText("Saved without embeddings.")).toBeInTheDocument();
  });

  it("clicking Remove fires DELETE and updates the list", async () => {
    const user = userEvent.setup();
    apiMock
      .mockResolvedValueOnce({
        documents: [
          {
            id: "doc-1",
            source_type: "text",
            source_id: null,
            content: "Delete me",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({});

    render(<KnowledgeManager />);

    expect(await screen.findByText("Delete me")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith("/api/settings/ai-knowledge/doc-1", { method: "DELETE" });
    });
    await waitFor(() => {
      expect(screen.queryByText("Delete me")).not.toBeInTheDocument();
    });
  });
});
