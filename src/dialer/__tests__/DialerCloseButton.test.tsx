// BF_PORTAL_BLOCK_v86c_TEST_PINS_FOR_REVERTED_CONTRACT_v1
// DialerPanel calls useSilo() from @/hooks/useSilo. Under the new
// SiloContext facade, that hook throws "SiloProvider missing" if
// there's no provider in the tree. This test renders DialerPanel
// bare — under the OLD @/core/SiloContext that worked because the
// context defaulted to "BF" with no required provider.
//
// Mock useSilo locally so we don't have to wrap with
// BusinessUnitProvider + SiloProvider + an AuthContext mock just to
// render a phone widget.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DialerPanel from "@/components/dialer/DialerPanel";
import { useDialerStore } from "@/state/dialer.store";

// BF_PORTAL_BLOCK_BI_DIALER_CONSOLIDATION_PHASE3_v1
// DialerPanel no longer imports from @/services/twilioVoice (Block 4
// removed the local Device + fetchTwilioToken). DialerPanel now
// imports startPortalCall from @/telephony/bootstrapVoice. Mock that
// so render does not trip on bootstrap's module-level init.
// The twilio voice-sdk mock stays: bootstrapVoice itself imports
// Call + Device from it at module scope.
vi.mock("@twilio/voice-sdk", () => ({ Device: vi.fn(), Call: vi.fn() }));
vi.mock("@/telephony/bootstrapVoice", () => ({ startPortalCall: vi.fn() }));
// BF_PORTAL_BLOCK_v86c — useSilo now throws without a provider; mock
// it for unit tests that don't care about silo state.
vi.mock("@/hooks/useSilo", () => ({
  useSilo: () => ({ silo: "bf", setSilo: vi.fn() }),
}));

describe("DialerPanel close affordance", () => {
  it("minimizes without ending active call and end button ends", () => {
    useDialerStore.setState({
      isOpen: true,
      isMinimized: false,
      status: "connected",
      number: "+15551234567",
      elapsedSeconds: 10,
    } as any);
    const endSpy = vi.spyOn(useDialerStore.getState(), "endCall");
    render(<DialerPanel />);

    const close = screen.getByRole("button", { name: "Close dialer" });
    expect(close).toHaveStyle({ width: "48px", height: "48px" });
    fireEvent.click(close);

    expect(useDialerStore.getState().isMinimized).toBe(true);
    expect(endSpy).not.toHaveBeenCalled();

    const end = screen.getByRole("button", { name: "End call" });
    fireEvent.click(end);
    expect(endSpy).toHaveBeenCalled();
  });
});
