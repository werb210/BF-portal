// BF_PORTAL_v960_LENDER_REPS - pick the rep handling a file at a lender, or add a new one.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put } }));

import LenderRepPicker from "../LenderRepPicker";

const REP = { id: "r1", lender_id: "L1", name: "Pat Sample", position: "Underwriter", email: "pat@lender.example", phone: "403-555-0142", phone_extension: "106" };
const lenders = (rep_id: string | null, reps = [REP]) => [{ lender_id: "L1", lender_name: "Sample Lender", rep_id, reps }];
const show = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <LenderRepPicker applicationId="app-1" lenderId="L1" lenderName="Sample Lender" />
  </QueryClientProvider>,
);

beforeEach(() => { h.get.mockReset(); h.post.mockReset(); h.put.mockReset(); });

describe("rep handling this file", () => {
  it("lists the lender's reps and saves the one picked", async () => {
    h.get.mockResolvedValue({ ok: true, lenders: lenders(null) });
    h.put.mockResolvedValue({ ok: true, lenders: lenders("r1") });
    show();
    const select = (await screen.findByLabelText("Rep handling this file")) as HTMLSelectElement;
    expect(select.value).toBe("");
    fireEvent.change(select, { target: { value: "r1" } });
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/portal/applications/app-1/lenders/L1/rep", { rep_id: "r1" }));
    expect(await screen.findByText("Saved. Everything for this file now goes to this rep only.")).toBeTruthy();
    expect(screen.getByText("pat@lender.example")).toBeTruthy();
    expect(screen.getByText(/ext\. 106/)).toBeTruthy();
  });

  it("adds a new rep and sets them on the file in one step", async () => {
    h.get.mockResolvedValue({ ok: true, lenders: lenders(null, []) });
    h.post.mockResolvedValue({ ok: true, rep: REP, lenders: lenders("r1") });
    show();
    fireEvent.change(await screen.findByLabelText("Rep handling this file"), { target: { value: "__add__" } });
    fireEvent.change(screen.getByLabelText("Rep's name"), { target: { value: "Pat Sample" } });
    fireEvent.change(screen.getByLabelText("Rep's position"), { target: { value: "Underwriter" } });
    fireEvent.change(screen.getByLabelText("Rep's email"), { target: { value: "pat@lender.example" } });
    fireEvent.change(screen.getByLabelText("Rep's direct phone"), { target: { value: "403-555-0142" } });
    fireEvent.change(screen.getByLabelText("Rep's extension"), { target: { value: "106" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rep" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/portal/lenders/L1/reps", { name: "Pat Sample", position: "Underwriter", email: "pat@lender.example", phone: "403-555-0142", phone_extension: "106", application_id: "app-1" }));
    await waitFor(() => expect((screen.getByLabelText("Rep handling this file") as HTMLSelectElement).value).toBe("r1"));
  });

  it("says what is missing in the server's words", async () => {
    h.get.mockResolvedValue({ ok: true, lenders: lenders(null, []) });
    h.post.mockRejectedValue({ details: { ok: false, errors: { email: "Enter the rep's email address." } } });
    show();
    fireEvent.change(await screen.findByLabelText("Rep handling this file"), { target: { value: "__add__" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rep" }));
    expect(await screen.findByText("Enter the rep's email address.")).toBeTruthy();
  });
});
