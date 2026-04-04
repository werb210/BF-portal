import { create } from "zustand";
const shiftDate = (date, view, direction) => {
    const next = new Date(date);
    if (view === "day")
        next.setDate(date.getDate() + direction);
    if (view === "week")
        next.setDate(date.getDate() + 7 * direction);
    if (view === "month")
        next.setMonth(date.getMonth() + direction);
    return next;
};
export const useCalendarStore = create((set, get) => ({
    currentDate: new Date(),
    view: "week",
    meetingLinks: [],
    setView: (view) => set({ view }),
    goToToday: () => set({ currentDate: new Date() }),
    goPrev: () => set({ currentDate: shiftDate(get().currentDate, get().view, -1) }),
    goNext: () => set({ currentDate: shiftDate(get().currentDate, get().view, 1) }),
    setMeetingLinks: (links) => set({ meetingLinks: links })
}));
