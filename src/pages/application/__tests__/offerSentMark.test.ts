// A term sheet that was sent to the client reads as sent after a reload: the server reports when it went out
// (sent_for_signature_at) while the offer's status stays "pending" until the client accepts.
import { describe, expect, it } from "vitest";
import { offerStateOf, nextStepFor } from "../nextStep";
import { tidyRate } from "../OfferTab";

describe("a sent term sheet", () => {
  it("is not a draft once it has been sent", () => {
    expect(offerStateOf([{ status: "pending" }])).toBe("draft");
    expect(offerStateOf([{ status: "pending", sent_for_signature_at: "2026-11-13 22:05:00+00" }])).toBe("sent");
    expect(nextStepFor({ stage: "Offer", signing: "signed", offers: 1, offerState: "sent" })?.label).toBe("Waiting for the client to sign");
  });
  it("one sent and one unsent still asks for the unsent one", () => {
    expect(offerStateOf([{ status: "pending", sent_for_signature_at: "x" }, { status: "pending" }])).toBe("draft");
  });
  it("an unsendable draft beside a sent one reads as sent", () => {
    expect(offerStateOf([{ status: "pending", sent_for_signature_at: "x" }, { status: "pending", expired: true }])).toBe("sent");
  });
});

describe("the rate on the summary line", () => {
  it("drops trailing zeros and leaves other text alone", () => {
    expect(tidyRate("9.5000")).toBe("9.5");
    expect(tidyRate("12.0000")).toBe("12");
    expect(tidyRate("1.30")).toBe("1.3");
    expect(tidyRate("100")).toBe("100");
    expect(tidyRate("Prime + 2")).toBe("Prime + 2");
    expect(tidyRate("")).toBe("");
  });
});
