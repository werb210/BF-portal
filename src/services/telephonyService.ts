type CallStatus = {
  status: string;
  activeCall: boolean;
  timestamp?: string;
};

export async function getCallStatus(): Promise<CallStatus> {
  // Non-MVP endpoint removed from BF-server contract.
  return {
    status: "offline",
    activeCall: false
  };
}
