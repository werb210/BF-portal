// BF_PORTAL_BLOCK_v465_SIGNING_DELIVERY
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describeSigningDelivery, explainSmsError } from "../signingDelivery";

const base = { name: "Brandon Voss", sms: { to: "+19173043342", sentAt: "2026-09-24T18:35:51Z" } };

describe("v465 signing text delivery on the Lenders tab", () => {
  it("a blocked US text is red and says why and what to do", () => {
    const d = describeSigningDelivery({ ...base, sms: { ...base.sms, status: "undelivered", errorCode: "30034" } });
    expect(d?.tone).toBe("error");
    expect(d?.text).toContain("Signing text to Brandon Voss at (917) 304-3342");
    expect(d?.text).toContain("not yet registered for US texting (A2P 10DLC) (error 30034)");
    expect(d?.text).toContain("sign in at client.boreal.financial");
  });

  it("delivered is green", () => {
    const d = describeSigningDelivery({ ...base, sms: { ...base.sms, status: "delivered" } });
    expect(d?.tone).toBe("success");
    expect(d?.text).toContain("Signing text delivered to Brandon Voss at (917) 304-3342");
  });

  it("queued or sent is waiting, not success", () => {
    for (const status of ["queued", "sent", "accepted"]) {
      expect(describeSigningDelivery({ ...base, sms: { ...base.sms, status } })?.tone).toBe("muted");
    }
  });

  it("nothing sent yet shows nothing", () => {
    expect(describeSigningDelivery({ name: "x", sms: null })).toBeNull();
    expect(describeSigningDelivery(null)).toBeNull();
  });

  it("explains common carrier errors and falls back for the rest", () => {
    expect(explainSmsError("21610")).toContain("replied STOP");
    expect(explainSmsError("99999")).toBe("the carrier rejected it (error 99999)");
    expect(explainSmsError(null)).toBe("the carrier did not say why");
  });

  it("the Lenders tab loads it, polls until final, and refreshes after a send", () => {
    const src = readFileSync(path.join(process.cwd(), "src/pages/applications/tabs/LendersTab.tsx"), "utf8");
    expect(src).toContain('queryKey: ["signing-sms", id]');
    expect(src).toContain("/signing-sms`");
    expect(src).toContain('queryClient.invalidateQueries({ queryKey: ["signing-sms", id] });');
    expect(src).toContain('data-testid="signing-sms-status"');
  });
});
