// BF_PORTAL_v809_SMS_UPDATES_CONSENT - the SMS tab tells staff when a client did not tick "Text me updates about
// my application" (no automatic texts). Staff can still text them by hand.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import SiloContext from "@/context/SiloContext";

const h = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("@/api", () => ({ api: h.call }));

import SmsConsentTag from "../SmsConsentTag";

afterEach(() => { cleanup(); h.call.mockReset(); });

const inSilo = (silo: string, phone: string | null) =>
  render(
    <SiloContext.Provider value={{ silo, setSilo: () => undefined } as any}>
      <SmsConsentTag phone={phone} />
    </SiloContext.Provider>,
  );

describe("v809 No text consent tag", () => {
  it("shows for a BF client who did not say yes, asking by the number's digits", async () => {
    h.call.mockResolvedValue({ smsUpdatesConsent: false, recorded: false });
    inSilo("bf", "+1 (587) 444-1234");
    expect(await screen.findByTestId("sms-no-consent-tag")).toHaveTextContent("No text consent");
    expect(h.call).toHaveBeenCalledWith("/api/communications/sms/consent", { params: { phone: "15874441234" } });
  });

  it("stays hidden for a client who said yes, or when the check fails", async () => {
    h.call.mockResolvedValue({ smsUpdatesConsent: true });
    inSilo("bf", "5874441234");
    await waitFor(() => expect(h.call).toHaveBeenCalled());
    expect(screen.queryByTestId("sms-no-consent-tag")).toBeNull();
    cleanup();
    h.call.mockReset().mockRejectedValue(new Error("offline"));
    inSilo("bf", "5874441234");
    await waitFor(() => expect(h.call).toHaveBeenCalled());
    expect(screen.queryByTestId("sms-no-consent-tag")).toBeNull();
  });

  it("is not checked outside the BF silo or without a full number", () => {
    inSilo("bi", "5874441234");
    inSilo("bf", "4441234");
    inSilo("bf", null);
    expect(h.call).not.toHaveBeenCalled();
  });

  it("clears the previous client's tag while checking another number and ignores a late response", async () => {
    let resolveNext!: (result: { smsUpdatesConsent: boolean }) => void;
    h.call.mockResolvedValueOnce({ smsUpdatesConsent: false })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNext = resolve; }));
    const view = inSilo("bf", "5874441234");
    expect(await screen.findByTestId("sms-no-consent-tag")).toBeInTheDocument();
    view.rerender(
      <SiloContext.Provider value={{ silo: "bf", setSilo: () => undefined }}>
        <SmsConsentTag phone="5874445678" />
      </SiloContext.Provider>,
    );
    expect(screen.queryByTestId("sms-no-consent-tag")).toBeNull();
    view.rerender(
      <SiloContext.Provider value={{ silo: "bi", setSilo: () => undefined }}>
        <SmsConsentTag phone="5874445678" />
      </SiloContext.Provider>,
    );
    await act(async () => { resolveNext({ smsUpdatesConsent: false }); });
    expect(screen.queryByTestId("sms-no-consent-tag")).toBeNull();
    expect(h.call).toHaveBeenCalledTimes(2);
  });

});
