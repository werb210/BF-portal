// BF_PORTAL_v864_FINDTIME_AUTO - the availability grid re-checks by itself when the day or the
// ticked teammates change; nobody has to press Check again.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/api", () => ({ api: { get } }));

import FindATimePanel from "@/components/o365/FindATimePanel";

const scheduleCalls = (): string[] => get.mock.calls.map((c) => String(c[0])).filter((p) => p.startsWith("/api/calendar/schedule"));
const nth = (i: number): string => scheduleCalls()[i] ?? "";

describe("Find a time re-checks automatically (v864)", () => {
  beforeEach(() => {
    get.mockReset();
    get.mockImplementation(async (path: string) => {
      if (path === "/api/tasks/staff") {
        return { staff: [{ id: "u1", name: "Andrew Polturak", email: "andrew@example.com" }, { id: "u2", name: "Todd W", email: "todd@example.com" }] };
      }
      if (path.startsWith("/api/calendar/schedule")) {
        return { schedules: [{ scheduleId: "andrew@example.com", availabilityView: "0".repeat(48) }] };
      }
      throw new Error("unexpected " + path);
    });
  });

  it("checks when a teammate is ticked, and again on Next / Today / date picker, without pressing Check", async () => {
    render(<FindATimePanel />);
    fireEvent.click(await screen.findByLabelText(/Andrew Polturak/));
    await waitFor(() => expect(scheduleCalls()).toHaveLength(1));
    const first = nth(0);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(scheduleCalls()).toHaveLength(2));
    const second = nth(1);
    const startOf = (p: string) => new URL("http://x" + p).searchParams.get("start");
    expect(startOf(second)).not.toBe(startOf(first));
    expect(new Date(startOf(second)!).getTime() - new Date(startOf(first)!).getTime()).toBeGreaterThan(20 * 3600 * 1000);

    fireEvent.change(screen.getByLabelText("Find a time date"), { target: { value: "2026-12-01" } });
    await waitFor(() => expect(scheduleCalls()).toHaveLength(3));
    expect(startOf(nth(2))).toBe(new Date(2026, 11, 1).toISOString());

    fireEvent.click(screen.getByLabelText(/Todd W/));
    await waitFor(() => expect(scheduleCalls()).toHaveLength(4));
    expect(decodeURIComponent(nth(3))).toContain("andrew@example.com,todd@example.com");
  });

  it("folds quick clicks into one request and labels the grid with the fetched day", async () => {
    render(<FindATimePanel />);
    fireEvent.click(await screen.findByLabelText(/Andrew Polturak/));
    await waitFor(() => expect(scheduleCalls()).toHaveLength(1));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });
    await waitFor(() => expect(scheduleCalls()).toHaveLength(2));
    const picked = (screen.getByLabelText("Find a time date") as HTMLInputElement).value;
    const [y = 2026, m = 1, d = 1] = picked.split("-").map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    expect(await screen.findByText(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
  });

  it("clears the grid when every teammate is unticked", async () => {
    render(<FindATimePanel />);
    const box = await screen.findByLabelText(/Andrew Polturak/);
    fireEvent.click(box);
    await screen.findByText("Free");
    fireEvent.click(box);
    await waitFor(() => expect(screen.queryByText("Free")).not.toBeInTheDocument());
  });
});
