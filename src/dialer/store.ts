// BF_PORTAL_BLOCK_v600_DIALER_PROVIDER_v1
import { create } from "zustand";
import type { Call, Device } from "@twilio/voice-sdk";
import type { DialerState, DialerCtx, Conference, Participant, TranscriptSegment } from "./types";
import { ringPush } from "./debugRing";

type Actions = {
  setDevice(d: Device | null): void;
  setStatus(s: DialerState["status"], error?: string | null): void;
  setCall(c: Call | null): void;
  setConference(c: Conference | null, participants?: Participant[]): void;
  patchParticipants(participants: Participant[]): void;
  setIncoming(v: DialerState["incoming"]): void;
  open(ctx?: DialerCtx): void;
  close(): void;
  minimize(v: boolean): void;
  setCtx(ctx: DialerCtx): void;
  appendTranscript(seg: TranscriptSegment): void;
  clearTranscript(): void;
  setMicPermission(p: DialerState["micPermission"]): void;
  setInputDevice(id: string | null): void;
  setOutputDevice(id: string | null): void;
  reset(): void;
};

const initial: DialerState = {
  status: "idle",
  error: null,
  device: null,
  call: null,
  conference: null,
  participants: [],
  transcript: [],
  incoming: null,
  isOpen: false,
  isMinimized: false,
  ctx: {},
  inputDeviceId: null,
  outputDeviceId: null,
  micPermission: "unknown",
};

export const useDialer = create<DialerState & Actions>((set, get) => ({
  ...initial,
  setDevice: (device) => {
    ringPush("store.device", !!device);
    set({ device });
  },
  setStatus: (status, error = null) => {
    ringPush("store.status", { status, error });
    set({ status, error });
  },
  setCall: (call) => {
    ringPush("store.call", !!call);
    set({ call });
  },
  setConference: (conference, participants) => set({ conference, participants: participants ?? get().participants }),
  patchParticipants: (participants) => set({ participants }),
  setIncoming: (incoming) => {
    ringPush("store.incoming", incoming);
    set({ incoming });
  },
  open: (ctx) => set({ isOpen: true, isMinimized: false, ctx: ctx ?? get().ctx }),
  close: () => set({ isOpen: false, isMinimized: false }),
  minimize: (v) => set({ isMinimized: v }),
  setCtx: (ctx) => set({ ctx }),
  appendTranscript: (seg) => {
    const t = get().transcript;
    const last = t[t.length - 1];
    if (last && !last.final && last.pid === seg.pid) {
      const copy = t.slice(0, -1);
      copy.push(seg);
      set({ transcript: copy });
      return;
    }
    set({ transcript: [...t, seg].slice(-500) });
  },
  clearTranscript: () => set({ transcript: [] }),
  setMicPermission: (micPermission) => set({ micPermission }),
  setInputDevice: (inputDeviceId) => set({ inputDeviceId }),
  setOutputDevice: (outputDeviceId) => set({ outputDeviceId }),
  reset: () => set({ ...initial }),
}));

export function openDialer(ctx?: DialerCtx) {
  useDialer.getState().open(ctx);
}
