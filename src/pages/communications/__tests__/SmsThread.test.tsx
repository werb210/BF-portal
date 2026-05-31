import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CommunicationsPage from "../CommunicationsPage";

const { apiMock } = vi.hoisted(() => {
  const mock: any = vi.fn();
  mock.get = vi.fn(); mock.post = vi.fn(); mock.patch = vi.fn();
  return { apiMock: mock };
});

vi.mock("@/api", () => ({ api: apiMock, default: apiMock }));

describe("Sms thread", () => {
  it("renders bubble when messages exist", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    apiMock.mockImplementation((url: any) => {
      const u = String(url ?? "");
      if (u.includes("/thread")) return Promise.resolve({ messages: [{ id: "m1", direction: "inbound", body: "hi", created_at: new Date().toISOString() }] });
      if (u.includes("/sms") || u.includes("messages-list")) return Promise.resolve({ conversations: [{ contact_id: "c-1", display_name: "Jordan", phone: "+1555", last_at: new Date().toISOString(), last_body: "hi" }] });
      return Promise.resolve({});
    });
    render(<CommunicationsPage />);
    fireEvent.click((await screen.findAllByText("Jordan"))[0]!);
    expect((await screen.findAllByText("hi")).length).toBeGreaterThan(0);
  });

  it("renders empty-state when no messages", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    apiMock.mockImplementation((url: any) => {
      const u = String(url ?? "");
      if (u.includes("/thread")) return Promise.resolve({ messages: [] });
      if (u.includes("/sms") || u.includes("messages-list")) return Promise.resolve({ conversations: [{ contact_id: "c-1", display_name: "Jordan", phone: "+1555", last_at: new Date().toISOString(), last_body: "hi" }] });
      return Promise.resolve({});
    });
    render(<CommunicationsPage />);
    fireEvent.click((await screen.findAllByText("Jordan"))[0]!);
    await waitFor(() => expect(screen.getByText(/No messages yet/i)).toBeInTheDocument());
  });
});
