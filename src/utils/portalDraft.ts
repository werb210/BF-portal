import type { PipelineFilters } from "@/core/engines/pipeline/pipeline.types";
import type { DrawerTabId } from "@/pages/applications/drawer/DrawerTabs";

const STORAGE_KEY = "portal.application.draft";

type PortalApplicationDraft = {
  pipelineFilters?: PipelineFilters;
  drawerTab?: DrawerTabId;
};

export const readPortalDraft = (): PortalApplicationDraft => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PortalApplicationDraft;
  } catch {
    return {};
  }
};

const writePortalDraft = (draft: PortalApplicationDraft) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
};

export const updatePortalDraft = (updates: PortalApplicationDraft): PortalApplicationDraft => {
  const next = { ...readPortalDraft(), ...updates };
  writePortalDraft(next);
  return next;
};

export const clearPortalDraft = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};
