import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MayaChat from "@/components/maya/MayaChat";
import { escalateToHuman, reportPortalIssue, sendMayaMessage } from "@/api/maya";

vi.mock("@/api/maya", () => ({
  sendMayaMessage: vi.fn().mockResolvedValue("Hello from Maya"),
  escalateToHuman: vi.fn().mockResolvedValue({ ok: true }),
  reportPortalIssue: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("MayaChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts collapsed and opens via FAB", async () => {
    const user = userEvent.setup();
    render(<MayaChat />);

    expect(screen.getByRole("button", { name: "Open Maya" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Maya assistant" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Maya" }));

    expect(await screen.findByRole("dialog", { name: "Maya assistant" })).toBeInTheDocument();
    expect(screen.getByText("👋 Hi, I'm Maya. How can I help you today?")).toBeInTheDocument();
  });

  it("calls escalate endpoint action", async () => {
    const user = userEvent.setup();
    render(<MayaChat />);

    await user.click(screen.getByRole("button", { name: "Open Maya" }));
    await user.click(screen.getByRole("button", { name: "Talk to Human" }));

    await waitFor(() => {
      expect(escalateToHuman).toHaveBeenCalledTimes(1);
    });
  });

  it("submits report issue message", async () => {
    const user = userEvent.setup();
    render(<MayaChat />);

    await user.click(screen.getByRole("button", { name: "Open Maya" }));
    await screen.findByRole("dialog", { name: "Maya assistant" });
    await user.click(screen.getByRole("button", { name: "Report Issue" }));
    const reportBox = screen.getByPlaceholderText("Describe the issue…").closest("div");
    expect(reportBox).not.toBeNull();
    await user.type(screen.getByPlaceholderText("Describe the issue…"), "Sidebar is clipped");
    await user.click(within(reportBox as HTMLElement).getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(reportPortalIssue).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Sidebar is clipped" }),
      );
    });
  });

  it("sends chat message", async () => {
    const user = userEvent.setup();
    render(<MayaChat />);

    await user.click(screen.getByRole("button", { name: "Open Maya" }));
    await screen.findByRole("dialog", { name: "Maya assistant" });
    await user.type(screen.getByPlaceholderText("Ask Maya anything…"), "Need pipeline status");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sendMayaMessage).toHaveBeenCalledWith("Need pipeline status");
    });
  });
});
