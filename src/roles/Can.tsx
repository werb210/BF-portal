// BF_PORTAL_v870_CRM_DATA_MODEL - renders its children only when the person's role allows the action (see permissionStore).
import type { ReactNode } from "react";
import { useCan, type Action, type Area } from "./permissionStore";

export default function Can({ area, action = "view", children, fallback = null }: { area: Area; action?: Action; children: ReactNode; fallback?: ReactNode }) {
  return <>{useCan(area, action) ? children : fallback}</>;
}
