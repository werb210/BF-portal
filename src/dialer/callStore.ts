export type CallStatus =
  | "idle"
  | "incoming"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "missed"
  | "voicemail";

let state: CallStatus = "idle";
let listeners: Array<(s: CallStatus) => void> = [];

export function setCallStatus(next: CallStatus) {
  state = next;
  listeners.forEach((listener) => listener(state));
}

export function getCallStatus(): CallStatus {
  return state;
}

export function subscribeCallStatus(fn: (s: CallStatus) => void) {
  listeners.push(fn);

  return () => {
    listeners = listeners.filter((listener) => listener !== fn);
  };
}
