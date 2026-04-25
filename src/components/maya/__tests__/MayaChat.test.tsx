import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MayaChat from "@/components/maya/MayaChat";
import { escalateToHuman, reportPortalIssue, sendMayaMessage } from "@/api/maya";

vi.mock("@/api/maya", () => ({
  sendMayaMessage: vi.fn().mockResolvedValue({ reply: "Hello from Maya" }),
  escalateToHuman: vi.fn().mockResolvedValue({ ok: true }),
  reportPortalIssue: vi.fn().mockResolvedValue({ ok: true }),
}));



beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});


vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => "data:image/png;base64,test",
  }),
}));

describe("MayaChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders greeting and action buttons", () => {
    render(<MayaChat />);

    expect(screen.getByText("Hi, I'm Maya. How can I help with your work today?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Talk to Human" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Report Issue" })).toBeInTheDocument();
  });

  it("calls escalate endpoint action", async () => {
    const user = userEvent.setup();
    render(<MayaChat />);

    await user.click(screen.getByRole("button", { name: "Talk to Human" }));

    await waitFor(() => {
      expect(escalateToHuman).toHaveBeenCalledTimes(1);
    });
  });

  it("submits report issue message", async () => {
    const user = userEvent.setup();
    render(<MayaChat />);

    await user.click(screen.getByRole("button", { name: "Report Issue" }));
    await user.type(screen.getByPlaceholderText("Describe the issue"), "Sidebar is clipped");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(reportPortalIssue).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Sidebar is clipped" }),
      );
    });
  });

  it("sends chat message", async () => {
    const user = userEvent.setup();
    render(<MayaChat />);

    await user.type(screen.getByPlaceholderText("Ask Maya anything…"), "Need pipeline status");
    await user.click(screen.getByRole("button", { name: "↑" }));

    await waitFor(() => {
      expect(sendMayaMessage).toHaveBeenCalledWith("Need pipeline status");
    });
  });
});
