// BF_PORTAL_v867_BROKER_TOOLS_2 - Boreal has no plans: every broker tool is shown (Keystone puts each behind its plan feature).
import type { ReactNode } from "react";

export default function Gate({ children }: { feature: string; compact?: boolean; children: ReactNode }) {
  return <>{children}</>;
}
