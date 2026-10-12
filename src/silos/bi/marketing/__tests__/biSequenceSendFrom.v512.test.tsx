// BF_PORTAL_BLOCK_v512_BI_SEQUENCE_SEND_FROM
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/components/marketing/BrandedEmailComposer", () => ({ default: () => <div>email composer</div> }));
vi.mock("@/components/marketing/LinkClicksPanel", () => ({ default: () => null }));
vi.mock("@/silos/bi/marketing/tabs/SequencesTab", () => ({ default: () => <div>sequence list</div> }));
vi.mock("@/components/marketing/SequenceCanvas", () => ({
  default: ({ onSave }: { onSave: (steps: unknown[]) => void }) => (
    <button type="button" onClick={() => onSave([{ type: "email", templateId: "t1", delayDays: 0 }])}>Save canvas</button>
  ),
}));

import BIMarketing from "../BIMarketing";

const DEFAULT_SENDER = "andrew.p@boreal.financial";

beforeEach(() => {
  h.apiFn.get.mockReset();
  h.apiFn.post.mockReset();
  h.apiFn.get.mockImplementation(async (url: string) => {
    if (url === "/api/crm/shared-mailboxes") return { mine: { address: "Todd.W@boreal.financial" }, shared: [{ address: "info@boreal.insure" }] };
    if (url === "/api/users") return { users: [] };
    return {};
  });
  h.apiFn.post.mockImplementation(async (url: string) => (url === "/api/v1/bi/marketing/sequences" ? { sequence: { id: "s1" } } : {}));
});

async function openBuilder() {
  render(<BIMarketing />);
  fireEvent.click(screen.getByRole("tab", { name: "Sequences" }));
  fireEvent.change(screen.getByLabelText("Sequence name"), { target: { value: "Renewals" } });
  return screen.getByTestId("bi-sequence-send-from") as HTMLSelectElement;
}

function createCall() {
  return h.apiFn.post.mock.calls.find((c: unknown[]) => c[0] === "/api/v1/bi/marketing/sequences") as [string, Record<string, unknown>] | undefined;
}

describe("v512 BI sequence Send from", () => {
  it("defaults to andrew.p@boreal.financial and saves it as the sender", async () => {
    const select = await openBuilder();
    expect(select.value).toBe(DEFAULT_SENDER);
    fireEvent.click(screen.getByRole("button", { name: "Save canvas" }));
    await waitFor(() => expect(createCall()).toBeDefined());
    expect(createCall()![1]).toMatchObject({ name: "Renewals", sender_rotation: [DEFAULT_SENDER] });
  });

  it("offers the user's own and shared mailboxes and saves the one picked", async () => {
    const select = await openBuilder();
    await waitFor(() => expect(Array.from(select.options).map((o) => o.value)).toEqual([DEFAULT_SENDER, "todd.w@boreal.financial", "info@boreal.insure"]));
    fireEvent.change(select, { target: { value: "info@boreal.insure" } });
    fireEvent.click(screen.getByRole("button", { name: "Save canvas" }));
    await waitFor(() => expect(createCall()).toBeDefined());
    expect(createCall()![1]).toMatchObject({ sender_rotation: ["info@boreal.insure"] });
  });
});
