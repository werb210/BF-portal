import { create } from "zustand";
export const useApiStatusStore = create((set) => ({
    status: "starting",
    setStatus: (status) => set({ status })
}));
export const setApiStatus = (status) => {
    useApiStatusStore.setState({ status });
};
