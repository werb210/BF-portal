// BF_PORTAL_SHARED_CONTACTS_v1 - Marketing > Contacts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/api", () => ({ api: Object.assign(vi.fn(), { get: h.get, post: h.post, put: vi.fn(), patch: vi.fn(), delete: vi.fn() }) }));

import SharedContactsPanel, { parseCsv, rowsToList, statusLabel } from "../SharedContactsPanel";

const PEOPLE = {
  total: 1,
  people: [{ id: "11111111-1111-4111-8111-111111111111", name: "Evan Sinclair", email: "evan@chosencapital.ca", title: "Owner", kind: "broker", country: "CA", region: "AB", firm: "Chosen Capital", sources: ["Broker list"],
    brands: { KS: { status: "loaded", last_activity: "lead", at: null }, BI: { status: "opted_out", last_activity: null, at: null } } }],
};

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset();
  h.get.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/directory/sources")) return { sources: [{ source: "Broker list", people: 1 }] };
    if (path.startsWith("/api/directory/people/")) return { person: { ...PEOPLE.people[0], phone: null, website: null, all_brands_opt_out: false, bad_address: false,
      brands: [{ brand: "BI", status: "opted_out", consent_source: "Published business email", last_activity: null, last_activity_at: null, consent_basis: null, silo_record_id: "b1" }] } };
    return PEOPLE;
  });
});

describe("Contacts panel", () => {
  it("lists people with a chip per brand, and opens a person", async () => {
    render(<SharedContactsPanel />);
    expect(await screen.findByText("Evan Sinclair")).toBeTruthy();
    expect(screen.getByTestId("chip-KS").textContent).toBe("Keystone: lead");
    expect(screen.getByTestId("chip-BI").textContent).toBe("PGI: Unsubscribed");
    fireEvent.click(screen.getByTestId("contacts-row"));
    expect(await screen.findByText(/Basis: Published business email/)).toBeTruthy();
  });
  it("shows the opted-out view on request", async () => {
    render(<SharedContactsPanel />);
    await screen.findByText("Evan Sinclair");
    fireEvent.change(screen.getByLabelText("Opted out"), { target: { value: "only" } });
    await waitFor(() => expect(h.get.mock.calls.some((c: any[]) => String(c[0]).includes("opted_out=only"))).toBe(true));
  });
  it("filters go to the server", async () => {
    render(<SharedContactsPanel />);
    await screen.findByText("Evan Sinclair");
    fireEvent.change(screen.getByLabelText("Not in brand"), { target: { value: "KS" } });
    await waitFor(() => expect(h.get.mock.calls.some((c) => String(c[0]).includes("not_brand=KS"))).toBe(true));
  });
  it("reads the silos on request and says what happened", async () => {
    h.post.mockResolvedValueOnce({ results: [{ brand: "BI", read: 40, people_added: 3 }, { brand: "KS", read: 10, people_added: 1 }] });
    render(<SharedContactsPanel />);
    fireEvent.click(screen.getByText("Refresh from silos"));
    expect(await screen.findByText("PGI: read 40, 3 new · Keystone: read 10, 1 new")).toBeTruthy();
    expect(h.post).toHaveBeenCalledWith("/api/directory/sync", {});
  });
});

describe("list files", () => {
  it("reads CSV with quotes and common headers into firms and people", () => {
    const rows = parseCsv('Company,First Name,Last Name,Email,Title,Country,State,Website\n"Chosen Capital, Inc.",Evan,Sinclair,evan@chosencapital.ca,Owner,Canada,AB,chosencapital.ca\n"Chosen Capital, Inc.",,,,,,,\n');
    const { companies, contacts } = rowsToList(rows);
    expect(companies[0]).toMatchObject({ name: "Chosen Capital, Inc.", website: "chosencapital.ca", address_country: "Canada", address_state: "AB" });
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ name: "Evan Sinclair", email: "evan@chosencapital.ca", job_title: "Owner" });
  });
  it("labels statuses in plain words", () => {
    expect(statusLabel("loaded")).toBe("Not contacted");
    expect(statusLabel("opted_out", "contacted")).toBe("Unsubscribed");
    expect(statusLabel("loaded", "demo_booked")).toBe("demo booked");
    expect(statusLabel("loaded", null, "BF")).toBe("In BF CRM");
    expect(statusLabel("opted_out", null, "BF")).toBe("Unsubscribed");
  });
});
