import { api } from "@/api";
export const fetchLocalEvents = async () => {
    const res = await api.getList("/calendar/events");
    return res;
};
export const createLocalEvent = (event) => api.post("/calendar/events", event);
export const updateLocalEvent = (id, event) => api.patch(`/calendar/events/${id}`, event);
export const deleteLocalEvent = (id) => api.delete(`/calendar/events/${id}`);
