export const groupEventsByDay = (events) => {
    return events.reduce((acc, event) => {
        const key = new Date(event.start).toDateString();
        acc[key] = acc[key] ? [...acc[key], event] : [event];
        return acc;
    }, {});
};
export const sortEvents = (events) => [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
export const getStartOfWeek = (date) => {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const start = new Date(date);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
};
export const getWeekDays = (date) => {
    const start = getStartOfWeek(date);
    return Array.from({ length: 7 }).map((_, idx) => {
        const day = new Date(start);
        day.setDate(start.getDate() + idx);
        return day;
    });
};
export const getMonthGrid = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const start = getStartOfWeek(firstDay);
    return Array.from({ length: 42 }).map((_, idx) => {
        const day = new Date(start);
        day.setDate(start.getDate() + idx);
        return day;
    });
};
