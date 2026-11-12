// BF_PORTAL_v938_CARD_REDESIGN - the card's "Next step" button. It names the next thing to do on the file and opens the
// tab where it is done. Nothing happens on the click itself, so a wrong guess costs one tab switch.
export type NextStep = { label: string; tab: string; waiting?: boolean };

/** Where the file's term sheets stand: none saved, saved but not sent, sent and waiting, or signed. */
export type OfferState = "none" | "draft" | "sent" | "signed";
export function offerStateOf(offers: Array<{ status?: string | null }>): OfferState {
  if (!offers.length) return "none";
  if (offers.some((o) => o.status === "accepted")) return "signed";
  if (offers.some((o) => o.status === "pending")) return "draft";
  return "sent";
}

export function nextStepFor(input: { stage: string | null | undefined; signing: string | null | undefined; offers: number; offerState?: OfferState }): NextStep | null {
  const stage = String(input.stage ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  const signed = input.signing === "signed";
  if (!stage || stage === "funded" || stage === "rejected" || stage === "hold" || stage === "fraud") return null;
  if (stage === "new (website)" || stage === "draft") return { label: "Follow up on the unfinished application", tab: "application" };
  if (stage === "documents required") return { label: "Request missing items", tab: "request-items" };
  if (stage === "received" || stage === "in review" || stage === "inreview" || stage === "start up" || stage === "startup") {
    return signed ? { label: "Send to lenders", tab: "lenders" } : { label: "Send application for signing", tab: "application" };
  }
  if (stage === "off to lender" || stage === "offtolender") return input.offers > 0 ? { label: "Review the offer", tab: "offer" } : { label: "Upload the lender's term sheet", tab: "lenders" };
  if (stage === "offer") {
    // BF_PORTAL_v946_OFFER_STEPS - the button follows the Offer tab's steps instead of always saying "send".
    if (input.offerState === "none") return { label: "Add the term sheet", tab: "offer" };
    if (input.offerState === "sent") return { label: "Waiting for the client to sign", tab: "offer", waiting: true };
    if (input.offerState === "signed") return { label: "Clear funding conditions", tab: "offer" };
    return { label: "Send term sheet for signature", tab: "offer" };
  }
  if (stage === "accepted") return { label: "Clear funding conditions", tab: "offer" };
  return null;
}
