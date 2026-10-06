// BF_PORTAL_NO_DUPLICATE_ROOMS_v751
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const post = vi.fn();
vi.mock("@/api", () => ({ api: { get: vi.fn(async () => ({ meetings: [] })), post: (...a: unknown[]) => post(...a) } }));
vi.mock("@/components/meetings/PeoplePicker", () => ({ default: () => null }));

import MeetingRoomsPanel from "../MeetingRoomsPanel";

describe("creating the same meeting again", () => {
  beforeEach(() => post.mockReset());
  it("says so when the server returns the room already made", async () => {
    post.mockResolvedValue({ meeting: { id: "m1", code: "799151" }, duplicate: true, delivery: { calendar: "skipped", calendarError: null, emailed: 0, texted: 0, errors: [] } });
    render(<MeetingRoomsPanel />);
    fireEvent.change(screen.getByLabelText("Meeting title"), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "2026-10-06T14:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Create meeting" }));
    await waitFor(() => expect(screen.getByText(/already created - access code 799151\. No second room was made\./)).toBeTruthy());
  });
});
