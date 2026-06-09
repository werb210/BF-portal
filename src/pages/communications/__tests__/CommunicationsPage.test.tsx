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
  it("broadcasts one in-app message to selected message contacts", async () => {
    apiMock.mockImplementation((url: string) => {
      if (url === "/api/communications/messages-list") {
        return Promise.resolve({
          conversations: [
            { contact_id: "c-1", display_name: "Jordan Lee", phone: "+15551234567", last_at: "2026-06-09T12:00:00Z", last_body: "Hi", unread_count: 0 },
            { contact_id: "c-2", display_name: "Alex Kim", phone: "+15557654321", last_at: "2026-06-09T11:00:00Z", last_body: "Hello", unread_count: 0 },
          ],
        });
      }
      if (url === "/api/communications/sms") return Promise.resolve({ conversations: [] });
      if (url === "/api/crm/inbox") return Promise.resolve([]);
      if (url === "/api/portal/issues") return Promise.resolve({ issues: [] });
      if (url === "/api/team/channels") return Promise.resolve({ channels: [] });
      if (url === "/api/communications/messages/thread") return Promise.resolve([]);
      if (url.includes("/api/crm/contacts/") && url.endsWith("/applications")) return Promise.resolve([]);
      if (url === "/api/communications/messages/typing") return Promise.resolve({ typing: false, label: null });
      return Promise.resolve({});
    });
    apiMock.post.mockResolvedValue({ sent: 2 });

    render(<CommunicationsPage />);

    fireEvent.click(screen.getByRole("button", { name: /^Messages$/ }));
    expect((await screen.findAllByText("Jordan Lee"))[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.click(screen.getByLabelText(/Select all \(2\)/));
    fireEvent.change(screen.getByPlaceholderText("Message 2 contact(s) individually…"), { target: { value: "Portal update" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to 2" }));

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith("/api/communications/broadcast", {
        contactIds: ["c-1", "c-2"],
        body: "Portal update",
        channel: "message",
      });
    });
  });

  it("loads SMS thread messages from thread endpoint", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    apiMock.mockResolvedValueOnce({
      conversations: [{ contact_id: "c-1", display_name: "Jordan Lee", phone: "+15551234567", last_at: new Date().toISOString() }],
    });
    apiMock.mockResolvedValueOnce({ messages: [] });
    apiMock.mockResolvedValueOnce({ mine: null, shared: [] });
    apiMock.mockResolvedValueOnce([]);

    render(<CommunicationsPage />);

    fireEvent.click((await screen.findAllByText("Jordan Lee"))[0]!);

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
