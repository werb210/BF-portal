import { create } from "zustand";
import { logCallEvent } from "@/api/crm";
import { logApplicationCallEvent } from "@/api/communications";

export type DialerStatus =
  | "idle"
  | "dialing"
  | "ringing"
  | "connected"
  | "completed"
  | "voicemail"
  | "ended"
  | "failed";
export type DialerOutcome = "completed" | "voicemail" | "no-answer" | "failed" | "canceled";
export type DialerFailureReason = "network" | "permission-denied" | "busy-no-answer" | "user-canceled" | "unknown";

export type DialerContext = {
  contactId?: string;
  contactName?: string;
  applicationId?: string;
  applicationName?: string;
  phone?: string;
  source?: "crm" | "pipeline" | "global";
};

export type DialerCallLog = {
  id: string;
  callId: string;
  contactId?: string;
  applicationId?: string;
  number: string;
  durationSeconds: number;
  outcome: DialerOutcome | null;
  status: DialerStatus;
  startedAt: string;
  endedAt: string | null;
  failureReason?: DialerFailureReason | null;
  recordingUrl?: string | null;
  isPending: boolean;
};

export type DialerState = {
  isOpen: boolean;
  isMinimized: boolean;
  context: DialerContext;
  status: DialerStatus;
  muted: boolean;
  onHold: boolean;
  keypadOpen: boolean;
  number: string;
  dialedNumber: string | null;
  error: string | null;
  warning: string | null;
  failureReason: DialerFailureReason | null;
  startedAt: string | null;
  elapsedSeconds: number;
  logs: DialerCallLog[];
  currentCallId: string | null;
  dialAttempts: { number: string; timestamp: number }[];
  openDialer: (context?: DialerContext) => void;
  closeDialer: () => void;
  minimizeDialer: () => void;
  setNumber: (number: string) => void;
  setDialedNumber: (number: string | null) => void;
  setError: (message: string | null) => void;
  setWarning: (message: string | null) => void;
  setFailureReason: (reason: DialerFailureReason | null) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  toggleHold: () => void;
  setOnHold: (onHold: boolean) => void;
  toggleKeypad: () => void;
  startCall: () => void;
  setStatus: (status: DialerStatus) => void;
  recordElapsed: (seconds: number) => void;
  registerDialAttempt: (number: string) => void;
  endCall: (
    outcome?: DialerOutcome,
    finalStatus?: DialerStatus,
    failureReason?: DialerFailureReason | null
  ) => DialerCallLog | null;
  resetCall: () => void;
};

const now = () => new Date().toISOString();
const SESSION_STORAGE_KEY = "dialer-session-v1";
const LOG_STORAGE_KEY = "dialer-call-logs-v1";
const CALL_IN_PROGRESS_STATUSES = ["dialing", "ringing", "connected"] as const;
const isCallInProgressStatus = (
  status?: DialerStatus | string | null
): status is (typeof CALL_IN_PROGRESS_STATUSES)[number] =>
  typeof status === "string" && CALL_IN_PROGRESS_STATUSES.includes(status as (typeof CALL_IN_PROGRESS_STATUSES)[number]);

const createCallId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `call-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readSessionState = (): Partial<DialerState> => {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Partial<DialerState>;
  } catch {
    return {};
  }
};

const readLogs = (): DialerCallLog[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as DialerCallLog[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const saveSessionState = (state: DialerState) => {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload = {
      isOpen: state.isOpen,
      isMinimized: state.isMinimized,
      context: state.context,
      status: state.status,
      muted: state.muted,
      onHold: state.onHold,
      keypadOpen: state.keypadOpen,
      number: state.number,
      dialedNumber: state.dialedNumber,
      error: state.error,
      warning: state.warning,
      failureReason: state.failureReason,
      startedAt: state.startedAt,
      elapsedSeconds: state.elapsedSeconds,
      currentCallId: state.currentCallId
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore session storage failures
  }
};

const saveLogs = (logs: DialerCallLog[]) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore storage failures
  }
};

const resolveOutcome = (status: DialerStatus, outcome?: DialerOutcome | null): DialerOutcome => {
  if (outcome) return outcome;
  if (status === "connected") return "completed";
  if (status === "voicemail") return "voicemail";
  if (status === "dialing" || status === "ringing") return "no-answer";
  if (status === "failed") return "failed";
  return "canceled";
};

const resolveFinalStatus = (status: DialerStatus, outcome: DialerOutcome): DialerStatus => {
  if (outcome === "completed") return "completed";
  if (outcome === "voicemail") return "voicemail";
  if (outcome === "no-answer" || outcome === "failed" || outcome === "canceled") return "failed";
  return status === "connected" ? "completed" : "failed";
};

const resolveFailureReason = (
  status: DialerStatus,
  outcome: DialerOutcome,
  failureReason?: DialerFailureReason | null
): DialerFailureReason | null => {
  if (failureReason) return failureReason;
  if (outcome === "canceled") return "user-canceled";
  if (outcome === "no-answer") return "busy-no-answer";
  if (status === "failed") return "unknown";
  return null;
};

const calculateDurationSeconds = (startedAt: string, endedAt: string) => {
  return Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
};

const sessionState = readSessionState();
const hasActiveSessionCall = isCallInProgressStatus(sessionState.status ?? null);
const sessionStartedAt = sessionState.startedAt ?? null;
const sessionElapsed = sessionStartedAt ? calculateDurationSeconds(sessionStartedAt, now()) : 0;
const restoredElapsed =
  hasActiveSessionCall && sessionStartedAt ? sessionElapsed : (sessionState.elapsedSeconds ?? 0);
const storedLogs = readLogs();

const { logs: hydratedLogs, pendingFlushLogs } = (() => {
  if (hasActiveSessionCall) {
    return { logs: storedLogs, pendingFlushLogs: [] as DialerCallLog[] };
  }
  const flushable: DialerCallLog[] = [];
  const updatedLogs = storedLogs.map((log) => {
    const shouldFinalize = log.isPending || isCallInProgressStatus(log.status);
    if (!shouldFinalize) return log;
    const endedAt = log.endedAt ?? now();
    const startedAt = log.startedAt ?? endedAt;
    const outcome = log.outcome ?? (log.isPending ? "canceled" : resolveOutcome(log.status, log.outcome));
    const updated = {
      ...log,
      status: resolveFinalStatus(log.status, outcome),
      outcome,
      failureReason: resolveFailureReason(log.status, outcome, log.failureReason),
      durationSeconds: calculateDurationSeconds(startedAt, endedAt),
      endedAt,
      isPending: false
    };
    flushable.push(updated);
    return updated;
  });
  return { logs: updatedLogs, pendingFlushLogs: flushable };
})();

export const useDialerStore = create<DialerState>((set, get) => ({
  isOpen: sessionState.isOpen ?? false,
  isMinimized: sessionState.isMinimized ?? false,
  context: sessionState.context ?? {},
  status: (sessionState.status as DialerStatus) ?? "idle",
  muted: sessionState.muted ?? false,
  onHold: sessionState.onHold ?? false,
  keypadOpen: sessionState.keypadOpen ?? false,
  number: sessionState.number ?? "",
  dialedNumber: sessionState.dialedNumber ?? null,
  error: sessionState.error ?? null,
  warning: sessionState.warning ?? null,
  failureReason: sessionState.failureReason ?? null,
  startedAt: sessionState.startedAt ?? null,
  elapsedSeconds: restoredElapsed,
  logs: hydratedLogs,
  currentCallId: sessionState.currentCallId ?? null,
  dialAttempts: [],
  openDialer: (context) =>
    set((state) => {
      const inProgress = isCallInProgressStatus(state.status);
      const nextNumber = inProgress ? state.number : context?.phone ?? state.number;
      return {
        isOpen: true,
        isMinimized: false,
        context: { ...state.context, ...context },
        number: nextNumber,
        status: inProgress ? state.status : "idle",
        muted: inProgress ? state.muted : false,
        onHold: inProgress ? state.onHold : false,
        keypadOpen: inProgress ? state.keypadOpen : false,
        dialedNumber: inProgress ? state.dialedNumber : null,
        error: inProgress ? state.error : null,
        warning: inProgress ? state.warning : null,
        failureReason: inProgress ? state.failureReason : null,
        startedAt: inProgress ? state.startedAt : null,
        elapsedSeconds: inProgress ? state.elapsedSeconds : 0,
        currentCallId: inProgress ? state.currentCallId : null
      };
    }),
  closeDialer: () => set({ isOpen: false, isMinimized: false }),
  minimizeDialer: () => set({ isOpen: false, isMinimized: true }),
  setNumber: (number) => set({ number }),
  setDialedNumber: (number) => set({ dialedNumber: number }),
  setError: (message) => set({ error: message }),
  setWarning: (message) => set({ warning: message }),
  setFailureReason: (reason) => set({ failureReason: reason }),
  toggleMute: () => set((state) => ({ muted: !state.muted })),
  setMuted: (muted) => set({ muted }),
  toggleHold: () => set((state) => ({ onHold: !state.onHold })),
  setOnHold: (onHold) => set({ onHold }),
  toggleKeypad: () => set((state) => ({ keypadOpen: !state.keypadOpen })),
  startCall: () =>
    set((state) => {
      if (!state.number || isCallInProgressStatus(state.status)) {
        return state;
      }
      const callId = state.currentCallId ?? createCallId();
      const startedAt = now();
      const existingLog = state.logs.find((log) => log.callId === callId);
      const pendingLog: DialerCallLog = existingLog ?? {
        id: callId,
        callId,
        contactId: state.context.contactId,
        applicationId: state.context.applicationId,
        number: state.number || "Unknown",
        durationSeconds: 0,
        outcome: null,
        status: "dialing",
        startedAt,
        endedAt: null,
        failureReason: null,
        recordingUrl: null,
        isPending: true
      };
      const logs = existingLog ? state.logs : [pendingLog, ...state.logs];
      return {
        status: "dialing",
        startedAt,
        elapsedSeconds: 0,
        currentCallId: callId,
        error: null,
        warning: state.warning,
        failureReason: null,
        logs
      };
    }),
  setStatus: (status) =>
    set((state) => {
      if (!state.currentCallId) return { status };
      const logs = state.logs.map((log) =>
        log.callId === state.currentCallId ? { ...log, status } : log
      );
      return { status, logs };
    }),
  recordElapsed: (seconds) => set({ elapsedSeconds: seconds }),
  registerDialAttempt: (number) =>
    set((state) => {
      const timestamp = Date.now();
      const recent = state.dialAttempts.filter((attempt) => timestamp - attempt.timestamp < 60000);
      const sameNumberAttempts = recent.filter((attempt) => attempt.number === number);
      const shouldWarn = sameNumberAttempts.length >= 2;
      return {
        dialAttempts: [...recent, { number, timestamp }],
        warning: shouldWarn
          ? "You're dialing the same number repeatedly. Double-check the number before redialing."
          : state.warning
      };
    }),
  endCall: (outcome, finalStatus, failureReason) => {
    const state = get();
    if (state.status === "idle") return null;
    const endedAt = now();
    const startedAt = state.startedAt ?? endedAt;
    const durationSeconds = calculateDurationSeconds(startedAt, endedAt);
    const resolvedOutcome = resolveOutcome(state.status, outcome);
    const resolvedNumber = state.dialedNumber || state.number || "Unknown";
    const resolvedStatus = finalStatus ?? resolveFinalStatus(state.status, resolvedOutcome);
    const resolvedFailureReason = resolveFailureReason(state.status, resolvedOutcome, failureReason ?? state.failureReason);
    const callId = state.currentCallId ?? createCallId();
    const log: DialerCallLog = {
      id: callId,
      callId,
      contactId: state.context.contactId,
      applicationId: state.context.applicationId,
      number: resolvedNumber,
      durationSeconds,
      outcome: resolvedOutcome,
      status: resolvedStatus,
      startedAt,
      endedAt,
      failureReason: resolvedFailureReason,
      recordingUrl: null,
      isPending: false
    };
    const logs = state.logs.some((entry) => entry.callId === callId)
      ? state.logs.map((entry) => (entry.callId === callId ? { ...entry, ...log } : entry))
      : [log, ...state.logs];

    if (state.context.contactId) {
      void logCallEvent({
        contactId: state.context.contactId,
        number: resolvedNumber,
        durationSeconds,
        outcome: resolvedOutcome,
        failureReason: resolvedFailureReason
      });
    }
    if (state.context.applicationId) {
      void logApplicationCallEvent({
        applicationId: state.context.applicationId,
        number: resolvedNumber,
        durationSeconds,
        outcome: resolvedOutcome,
        failureReason: resolvedFailureReason
      });
    }

    set({
      status: resolvedStatus,
      elapsedSeconds: durationSeconds,
      logs,
      failureReason: resolvedFailureReason,
      currentCallId: null
    });

    return log;
  },
  resetCall: () =>
    set({
      status: "idle",
      muted: false,
      onHold: false,
      keypadOpen: false,
      startedAt: null,
      elapsedSeconds: 0,
      dialedNumber: null,
      error: null,
      warning: null,
      failureReason: null,
      currentCallId: null
    })
}));

useDialerStore.subscribe((state, prevState) => {
  saveSessionState(state);
  if (state.logs !== prevState.logs) {
    saveLogs(state.logs);
  }
});

saveLogs(useDialerStore.getState().logs);

if (pendingFlushLogs.length) {
  queueMicrotask(() => {
    pendingFlushLogs.forEach((log) => {
      if (!log.outcome) return;
      if (log.contactId) {
        void logCallEvent({
          contactId: log.contactId,
          number: log.number,
          durationSeconds: log.durationSeconds,
          outcome: log.outcome,
          failureReason: log.failureReason ?? null
        });
      }
      if (log.applicationId) {
        void logApplicationCallEvent({
          applicationId: log.applicationId,
          number: log.number,
          durationSeconds: log.durationSeconds,
          outcome: log.outcome,
          failureReason: log.failureReason ?? null
        });
      }
    });
  });
}
