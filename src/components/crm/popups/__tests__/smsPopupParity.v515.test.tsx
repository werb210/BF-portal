// BF_PORTAL_BLOCK_v515_SMS_POPUP_PARITY
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn(async () => ({ id: "SM1" })) }));
vi.mock("@/api", () => ({ api: { post } }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { SmsPopup } from "../SmsPopup";

describe("v515 SMS popup parity", () => {
  it("shows the counter, has attach and emoji, and posts contactId", async () => {
    const onSent = vi.fn();
    render(createElement(SmsPopup, { contactId: "c1", defaultPhone: "+15875550100", onClose: vi.fn(), onSent }));
    fireEvent.change(screen.getByPlaceholderText("Message…"), { target: { value: "Hello there" } });
    expect(screen.getByTestId("sms-popup-segments").textContent).toContain("11 characters");
    expect(screen.getByTestId("sms-popup-attach")).toBeInTheDocument();
    expect(screen.getByTestId("emoji-picker-button")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/communications/sms", { contact_id: "c1", contactId: "c1", to: "+15875550100", body: "Hello there" }));
    expect(onSent).toHaveBeenCalled();
  });
});
