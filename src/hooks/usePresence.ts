import { useEffect } from "react";

export function usePresence(userId: string) {
  useEffect(() => {
    // Presence endpoint is not part of MVP contract.
    void userId;
    return undefined;
  }, [userId]);
}
