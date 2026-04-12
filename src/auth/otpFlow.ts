const OTP_FLOW_KEY = "otp_flow";

export type OtpFlowState = {
  pendingPhone: string | null;
  startRequested: boolean;
  startSucceeded: boolean;
};

const EMPTY_STATE: OtpFlowState = {
  pendingPhone: null,
  startRequested: false,
  startSucceeded: false,
};

const E164_NA_PATTERN = /^\+1\d{10}$/;

function isValidPendingPhone(phone: string | null): phone is string {
  return typeof phone === "string" && E164_NA_PATTERN.test(phone);
}

export function clearOtpFlowState() {
  sessionStorage.removeItem(OTP_FLOW_KEY);
}

function parseOtpFlowState(): OtpFlowState {
  const raw = sessionStorage.getItem(OTP_FLOW_KEY);
  if (!raw) return EMPTY_STATE;

  try {
    const parsed = JSON.parse(raw) as Partial<OtpFlowState>;
    const state: OtpFlowState = {
      pendingPhone: isValidPendingPhone(parsed.pendingPhone ?? null) ? parsed.pendingPhone ?? null : null,
      startRequested: Boolean(parsed.startRequested),
      startSucceeded: Boolean(parsed.startSucceeded),
    };

    if ((state.startSucceeded || state.startRequested) && !state.pendingPhone && state.startSucceeded) {
      clearOtpFlowState();
      return EMPTY_STATE;
    }

    return state;
  } catch {
    clearOtpFlowState();
    return EMPTY_STATE;
  }
}

export function setOtpStartRequested() {
  const next: OtpFlowState = {
    pendingPhone: null,
    startRequested: true,
    startSucceeded: false,
  };
  sessionStorage.setItem(OTP_FLOW_KEY, JSON.stringify(next));
}

export function setOtpStartSucceeded(phone: string) {
  const next: OtpFlowState = {
    pendingPhone: phone,
    startRequested: true,
    startSucceeded: true,
  };
  sessionStorage.setItem(OTP_FLOW_KEY, JSON.stringify(next));
}

export function getOtpFlowState(): OtpFlowState {
  return parseOtpFlowState();
}

export function sanitizeOtpFlowStateOnBoot() {
  const state = parseOtpFlowState();
  const isEmpty = !state.pendingPhone && !state.startRequested && !state.startSucceeded;
  const isComplete = Boolean(state.pendingPhone && state.startRequested && state.startSucceeded);

  if (!isEmpty && !isComplete) {
    clearOtpFlowState();
  }
}

export function hasPendingOtpVerification() {
  const state = parseOtpFlowState();
  return Boolean(state.pendingPhone && state.startRequested && state.startSucceeded);
}
