// BF_PORTAL_v864_OOO_UNTIL - "Active until" sends the day and the viewer's zone; the server ends it at the end of that day.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock("@/api", () => ({ api: { get, patch } }));

import OutOfOfficePanel from "@/components/o365/OutOfOfficePanel";
import { computeZone, localDateIn } from "@/lib/permanentTime";

describe("Out of office Active until (v864)", () => {
  beforeEach(() => {
    get.mockReset();
    patch.mockReset();
  });

  it("shows the date picker for On and sends activeUntil + timeZone", async () => {
    get.mockResolvedValue({ automaticRepliesSetting: { status: "disabled", externalReplyMessage: "Away" } });
    patch.mockResolvedValue({ ok: true, status: "scheduled", until: "2030-01-11T06:00:00.000Z" });
    render(<OutOfOfficePanel />);
    const select = await screen.findByDisplayValue("Off");
    fireEvent.change(select, { target: { value: "alwaysEnabled" } });
    const picker = screen.getByLabelText("Active until") as HTMLInputElement;
    expect(picker.type).toBe("date");
    fireEvent.change(picker, { target: { value: "2030-01-10" } });
    expect(screen.getByText(/Turns off automatically at the end of 2030-01-10/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save out-of-office" }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    const [path, body] = patch.mock.calls[0] ?? [];
    expect(path).toBe("/api/o365/mail/out-of-office");
    expect(body).toMatchObject({ status: "alwaysEnabled", activeUntil: "2030-01-10", externalReplyMessage: "Away" });
    expect(typeof body.timeZone).toBe("string");
    expect(await screen.findByText(/turns off at the end of 2030-01-10/)).toBeInTheDocument();
  });

  it("shows a saved Active until window as On with its day", async () => {
    get.mockResolvedValue({
      automaticRepliesSetting: { status: "scheduled" },
      borealOutOfOffice: { from: "2026-01-01T00:00:00Z", until: "2099-03-06T06:00:00.000Z", active: true },
    });
    render(<OutOfOfficePanel />);
    expect(await screen.findByDisplayValue("On")).toBeInTheDocument();
    const picker = screen.getByLabelText("Active until") as HTMLInputElement;
    expect(picker.value).toBe(localDateIn(new Date(Date.parse("2099-03-06T06:00:00.000Z") - 1)));
  });

  it("computes Alberta, Manitoba and B.C. as fixed offsets", () => {
    expect(computeZone("America/Edmonton")).toBe("America/Regina");
    expect(computeZone("America/Winnipeg")).toBe("Etc/GMT+5");
    expect(computeZone("America/Vancouver")).toBe("Etc/GMT+7");
    expect(localDateIn(new Date("2026-11-21T05:30:00Z"), "America/Edmonton")).toBe("2026-11-20");
  });
});
