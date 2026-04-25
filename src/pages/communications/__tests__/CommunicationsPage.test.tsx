import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CommunicationsPage from "../CommunicationsPage";

const { apiMock } = vi.hoisted(() => {
  type ApiMock = ReturnType<typeof vi.fn> & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
  const mock = vi.fn() as ApiMock;
  mock.get = vi.fn();
  mock.post = vi.fn();
  mock.patch = vi.fn();
  return { apiMock: mock };
});

vi.mock("@/api", () => ({
  default: apiMock,
  api: apiMock,
}));

describe("CommunicationsPage", () => {
  it("uses contact_id in messages query string", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    apiMock.mockResolvedValueOnce({
      conversations: [{ contact_id: "c-1", contact_name: "Jordan Lee", contact_phone: "+15551234567" }],
    });
    apiMock.mockResolvedValueOnce({ messages: [] });
    apiMock.mockResolvedValueOnce({ mine: null, shared: [] });
    apiMock.mockResolvedValueOnce([]);

    render(<CommunicationsPage />);

    fireEvent.click(await screen.findByText("Jordan Lee"));

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith("/api/communications/messages?contact_id=c-1");
    });
  });
});
