import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DialerPanel from "@/components/dialer/DialerPanel";
import { useDialerStore } from "@/state/dialer.store";

vi.mock("@/services/twilioVoice", () => ({ fetchTwilioToken: vi.fn() }));
vi.mock("@twilio/voice-sdk", () => ({ Device: vi.fn(), Call: vi.fn() }));

describe("DialerPanel close affordance", () => {
  it("minimizes without ending active call and end button ends", () => {
    useDialerStore.setState({ isOpen: true, isMinimized: false, status: "connected", number: "+15551234567", elapsedSeconds: 10 } as any);
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
