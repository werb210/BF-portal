import { useEffect, useState } from "react";
import { getCallStatus, subscribeCallStatus } from "@/dialer/callStore";

export function ActiveCallBanner(): JSX.Element | null {
  const [status, setStatus] = useState(getCallStatus());

  useEffect(() => subscribeCallStatus(setStatus), []);

  if (status === "idle" || status === "ended") return null;

  return <div className="call-banner p-2 text-sm font-medium">Current call status: {status}</div>;
}
