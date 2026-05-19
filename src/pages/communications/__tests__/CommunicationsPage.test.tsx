import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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


beforeEach(() => {
  apiMock.mockReset();
  apiMock.get.mockReset();
  apiMock.post.mockReset();
  apiMock.patch.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CommunicationsPage", () => {
  it("loads SMS thread messages from thread endpoint", async () => {
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
      expect(apiMock).toHaveBeenCalledWith("/api/communications/sms/thread", { params: { contactId: "c-1" } });
    });
  });
});


// BF_PORTAL_BLOCK_v305_SMS_EMPTY_STATE_DEFENSIVE_FILTER_v1
describe("CommunicationsPage contact filter", () => {
  it("treats phone_e164 as a valid phone", async () => {
    apiMock.mockResolvedValueOnce({ conversations: [] });
    apiMock.mockResolvedValueOnce([{ id: "crm-1", name: "Alex Kim", phone: null, phone_e164: "+15555550123" }]);
    apiMock.mockResolvedValue({ messages: [] });

    render(<CommunicationsPage />);

    expect(await screen.findByText("Alex Kim")).toBeInTheDocument();
    expect(screen.queryByText(/No CRM contacts with phone numbers yet/i)).not.toBeInTheDocument();
  });

  it("ignores whitespace-only phone values", async () => {
    apiMock.mockResolvedValueOnce({ conversations: [] });
    apiMock.mockResolvedValueOnce([{ id: "crm-2", name: "Taylor", phone: "   " }]);
    apiMock.mockResolvedValue({ messages: [] });

    render(<CommunicationsPage />);

    expect(await screen.findByText(/No CRM contacts with phone numbers yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Taylor")).not.toBeInTheDocument();
  });
});
