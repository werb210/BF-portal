import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AppLoading from "@/components/layout/AppLoading";
import { createLocalEvent, fetchLocalEvents } from "@/api/calendar";
import { useCalendarStore } from "@/state/calendar.store";
import CalendarHeader from "./CalendarHeader";
import CalendarView from "./CalendarView";
import TaskPane from "../tasks/TaskPane";
import { useTasksStore } from "@/state/tasks.store";
import RequireRole from "@/components/auth/RequireRole";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { getErrorMessage } from "@/utils/errors";
const CalendarContent = () => {
    const { view, setView, goNext, goPrev, goToToday, meetingLinks, currentDate } = useCalendarStore();
    const { setSelectedTask } = useTasksStore();
    const [showEventForm, setShowEventForm] = useState(false);
    const [showBooking, setShowBooking] = useState(false);
    const [eventDraft, setEventDraft] = useState({ title: "", start: "", end: "" });
    const queryClient = useQueryClient();
    const { data: localEvents = [], isLoading: loadingLocal, error: localError } = useQuery({ queryKey: ["local-events"], queryFn: fetchLocalEvents });
    useEffect(() => {
        if (!loadingLocal && !localError) {
            emitUiTelemetry("data_loaded", { view: "calendar", count: localEvents.length });
        }
    }, [localError, localEvents.length, loadingLocal]);
    const createEventMutation = useMutation({
        mutationFn: createLocalEvent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["local-events"] });
            setShowEventForm(false);
            setEventDraft({ title: "", start: "", end: "" });
        }
    });
    const handleAddEvent = () => {
        if (!eventDraft.title || !eventDraft.start || !eventDraft.end)
            return;
        createEventMutation.mutate(eventDraft);
    };
    return (_jsxs("div", { className: "page calendar-page", children: [_jsx("div", { className: "calendar-page__left", children: _jsxs(Card, { title: _jsx(CalendarHeader, { view: view, onViewChange: setView, onPrev: goPrev, onNext: goNext, onToday: goToToday, onAddTask: () => setSelectedTask({
                            id: "", title: "", priority: "medium", status: "todo"
                        }), onAddEvent: () => setShowEventForm((state) => !state), onBookMeeting: () => setShowBooking(true) }), children: [loadingLocal && _jsx(AppLoading, {}), localError && (_jsx("p", { className: "text-red-700", children: getErrorMessage(localError, "Unable to load calendar events.") })), !loadingLocal && !localError && localEvents.length === 0 && (_jsx("p", { children: "No calendar events scheduled yet." })), !loadingLocal && !localError && (_jsx(CalendarView, { view: view, date: currentDate, localEvents: localEvents })), showEventForm && (_jsxs("div", { className: "event-form", "data-testid": "event-form", children: [_jsx("h4", { children: "Add Event" }), _jsx(Input, { placeholder: "Title", value: eventDraft.title, onChange: (e) => setEventDraft({ ...eventDraft, title: e.target.value }) }), _jsx(Input, { type: "datetime-local", value: eventDraft.start, onChange: (e) => setEventDraft({ ...eventDraft, start: e.target.value }) }), _jsx(Input, { type: "datetime-local", value: eventDraft.end, onChange: (e) => setEventDraft({ ...eventDraft, end: e.target.value }) }), _jsx(Button, { onClick: handleAddEvent, children: "Save Event" })] })), showBooking && (_jsxs("div", { className: "booking-modal", role: "dialog", children: [_jsxs("div", { className: "booking-modal__header", children: [_jsx("h4", { children: "Book a Meeting" }), _jsx(Button, { variant: "secondary", onClick: () => setShowBooking(false), children: "Close" })] }), _jsxs("div", { className: "booking-modal__body", children: [meetingLinks.length === 0 && _jsx("p", { children: "No booking links configured." }), meetingLinks.map((link) => (_jsxs("div", { className: "booking-link", children: [_jsx("div", { children: link.name }), _jsx("a", { href: link.link, target: "_blank", rel: "noreferrer", children: "Open" }), _jsx(Button, { variant: "secondary", onClick: () => navigator.clipboard.writeText(link.link), "data-testid": `copy-${link.userId}`, children: "Copy Link" })] }, link.userId)))] })] }))] }) }), _jsx("div", { className: "calendar-page__right", children: _jsx(TaskPane, {}) })] }));
};
const CalendarPage = () => (_jsx(RequireRole, { roles: ["Admin", "Staff"], children: _jsx(CalendarContent, {}) }));
export default CalendarPage;
