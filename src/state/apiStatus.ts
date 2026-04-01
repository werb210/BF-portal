import { create } from "zustand";

export type ApiStatus = "starting" | "available" | "unavailable" | "unauthorized" | "forbidden" | "degraded";

type ApiStatusState = {
  status: ApiStatus;
  setStatus: (status: ApiStatus) => void;
};

export const useApiStatusStore = create<ApiStatusState>((set) => ({
  status: "starting",
  setStatus: (status) => set({ status })
}));

export const setApiStatus = (status: ApiStatus) => {
  useApiStatusStore.setState({ status });
};
