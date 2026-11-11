// BF_PORTAL_v938_CARD_REDESIGN - the card's "Next step" button. It names the next thing to do on the file and opens the
// tab where it is done. Nothing happens on the click itself, so a wrong guess costs one tab switch.
export type NextStep = { label: string; tab: string };

export function nextStepFor(input: { stage: string | null | undefined; signing: string | null | undefined; offers: number }): NextStep | null {
  const stage = String(input.stage ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  const signed = input.signing === "signed";
  if (!stage || stage === "funded" || stage === "rejected" || stage === "hold" || stage === "fraud") return null;
  if (stage === "new (website)" || stage === "draft") return { label: "Follow up on the unfinished application", tab: "application" };
  if (stage === "documents required") return { label: "Request missing items", tab: "request-items" };
  if (stage === "received" || stage === "in review" || stage === "inreview" || stage === "start up" || stage === "startup") {
    return signed ? { label: "Send to lenders", tab: "lenders" } : { label: "Send application for signing", tab: "application" };
  }
  if (stage === "off to lender" || stage === "offtolender") return input.offers > 0 ? { label: "Review the offer", tab: "offer" } : { label: "Upload the lender's term sheet", tab: "lenders" };
  if (stage === "offer") return { label: "Send term sheet for signature", tab: "offer" };
  if (stage === "accepted") return { label: "Clear funding conditions", tab: "offer" };
  return null;
}
