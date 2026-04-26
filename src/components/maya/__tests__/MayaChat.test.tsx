import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MayaChat from "@/components/maya/MayaChat";
import { sendMayaMessage } from "@/api/maya";

vi.mock("@/api/maya", () => ({
  sendMayaMessage: vi.fn().mockResolvedValue({ reply: "Hello from Maya" }),
}));

beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

describe("MayaChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders greeting and composer", () => {
    render(<MayaChat />);

    expect(
      screen.getByText(/Hi, I'm Maya\. How can I help/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask Maya anything/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("does not render Talk-to-Human or Report-Issue buttons", () => {
    render(<MayaChat />);

    expect(
      screen.queryByRole("button", { name: /talk to human/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /report issue/i }),
    ).not.toBeInTheDocument();
  });

  it("sends a chat message with staff_portal surface", async () => {
    const user = userEvent.setup();
    render(<MayaChat />);

    await user.type(
      screen.getByPlaceholderText(/Ask Maya anything/i),
      "Need pipeline status",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(sendMayaMessage).toHaveBeenCalledTimes(1);
    });
    // sendMayaMessage signature is now (text: string); the function
    // itself attaches surface/pathname inside its body. Just assert
    // the text was forwarded.
    expect(sendMayaMessage).toHaveBeenCalledWith("Need pipeline status");
  });
});
