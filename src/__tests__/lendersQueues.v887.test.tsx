// BF_PORTAL_v887 - Lenders tab real match % and funding range, product codes in words, and the queue switch on My Profile.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, put: h.put, post: vi.fn() }, default: { get: h.get, put: h.put, post: vi.fn() } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "Marketing" } }) }));
vi.mock("@/dialer/actions", () => ({ startOutboundPstn: vi.fn() }));

import { formatRange, getLikelihoodPercent } from "@/pages/applications/tabs/LendersTab";
import { humanizeCode, productNameWords } from "@/utils/labels";
import { MyQueueAvailability } from "@/callQueues/CallQueuesSettings";

beforeEach(() => { h.get.mockReset(); h.put.mockReset().mockResolvedValue({ ok: true }); });

describe("Lenders tab funding range and match % (v887)", () => {
  it("shows each lender's own range from its product", () => {
    expect(formatRange({ amountMin: 25000, amountMax: 250000 })).toBe("$25,000 – $250,000");
    expect(formatRange({ amountMin: "50000", amountMax: "1500000" } as any)).toBe("$50,000 – $1,500,000");
    expect(formatRange({ amountMin: 10000, amountMax: null })).toBe("From $10,000");
    expect(formatRange({ amountMin: null, amountMax: 500000 })).toBe("Up to $500,000");
  });

  it("says 'No range on file' instead of a dash", () => {
    expect(formatRange({ amountMin: null, amountMax: null })).toBe("No range on file");
    expect(formatRange({} as any)).toBe("No range on file");
    expect(formatRange({ amountMin: null, amountMax: 0 })).toBe("No range on file");
  });

  it("shows the server's whole-number percent as it is", () => {
    expect(getLikelihoodPercent({ matchPercent: 64 } as any)).toBe(64);
    expect(getLikelihoodPercent({ matchPercent: 1 } as any)).toBe(1);
    expect(getLikelihoodPercent({ matchPercent: 0.82 } as any)).toBe(82);
    expect(getLikelihoodPercent({ matchPercent: null } as any)).toBeNull();
  });
});

describe("product codes in words (v887)", () => {
  it("every short and long product code reads as words", () => {
    for (const [code, words] of [["TERM", "Term loan"], ["TERM_LOAN", "Term loan"], ["LOC", "Line of credit"], ["LINE_OF_CREDIT", "Line of credit"], ["MCA", "Merchant cash advance"]]) {
      expect(humanizeCode(code)).toBe(words);
    }
  });

  it("product names keep their words and lose only a code", () => {
    expect(productNameWords("AccordAccess")).toBe("AccordAccess");
    expect(productNameWords("Term Loan A")).toBe("Term Loan A");
    expect(productNameWords("TERM_LOAN")).toBe("Term loan");
    expect(productNameWords("Flexline - LOC")).toBe("Flexline - Line of credit");
    expect(productNameWords("")).toBe("");
  });
});

describe("My Profile queue switch (v887)", () => {
  it("someone in a queue gets the switch and can turn it on", async () => {
    h.get.mockResolvedValue({ available: false, queues: ["Sales"] });
    render(<MyQueueAvailability compact />);
    fireEvent.click(await screen.findByLabelText("Not taking queue calls"));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/call-queues/me", { available: true }));
    expect(screen.getByText("Your queues: Sales.")).toBeInTheDocument();
  });

  it("someone in no queue sees one line", async () => {
    h.get.mockResolvedValue({ available: false, queues: [] });
    render(<MyQueueAvailability compact />);
    expect((await screen.findByTestId("my-queue-none")).textContent).toBe("You're not in any call queue.");
    expect(screen.queryByText("My queue calls")).toBeNull();
  });
});
