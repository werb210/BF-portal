// BF_PORTAL_MEETING_PARTICIPANTS_v737
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
const get = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: any[]) => get(...a) } }));
import PeoplePicker, { type Person } from "../PeoplePicker";
function Host({ start = [] as Person[], max = 9 }) { const [v, setV] = useState<Person[]>(start); return <PeoplePicker value={v} onChange={setV} max={max} />; }
beforeEach(() => { get.mockReset(); get.mockResolvedValue({ people: [{ contactId: "c1", name: "Jeremy Girard", email: "j@avance.test", detail: "Avance", kind: "contact" }, { userId: "u1", name: "Andrew P", kind: "staff", detail: "Boreal staff" }] }); });
describe("people picker", () => {
  it("searches by name as you type and adds the person you pick", async () => {
    render(<Host />);
    fireEvent.change(screen.getByLabelText("Add people"), { target: { value: "jer" } });
    fireEvent.click(await screen.findByText("Jeremy Girard"));
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/meetings/people?q=jer"));
    expect(screen.getAllByTestId("person-chip")).toHaveLength(1);
    expect(screen.getByText("2 of 10 people (including you)")).toBeTruthy();
  });
  it("offers to invite a typed email that is not in the CRM", async () => {
    get.mockResolvedValue({ people: [] });
    render(<Host />);
    fireEvent.change(screen.getByLabelText("Add people"), { target: { value: "new@lender.test" } });
    fireEvent.click(await screen.findByText("new@lender.test"));
    expect(screen.getAllByTestId("person-chip")).toHaveLength(1);
  });
  it("stops at 10 people including you", () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ name: "P" + i, email: i + "@x.test" }));
    render(<Host start={nine} />);
    expect((screen.getByLabelText("Add people") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("10 of 10 people (including you)")).toBeTruthy();
  });
});
