// BF_PORTAL_BLOCK_v570
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const get = vi.fn(async () => ({ sessions: [], events: [], applications: [] }));
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...(a as [])) } }));
import ContactJourney from "../ContactJourney";

describe("v570 contact journey in both silos", () => {
  it("BF contacts read BF-Server by default", async () => {
    render(<ContactJourney contactId="c1" />);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/crm/contacts/c1/journey"));
    expect(await screen.findByText(/arrived via boreal\.financial/)).toBeTruthy();
  });
  it("BI contacts read BI-Server and name boreal.insure", async () => {
    render(<ContactJourney contactId="c2" endpoint="/api/v1/bi/crm/contacts/c2/journey" site="boreal.insure" />);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/v1/bi/crm/contacts/c2/journey"));
    expect(await screen.findByText(/arrived via boreal\.insure/)).toBeTruthy();
  });
});
