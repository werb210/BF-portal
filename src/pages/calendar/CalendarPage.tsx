import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AppLoading from "@/components/layout/AppLoading";
import type { CalendarEvent } from "@/api/calendar";
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
  const [eventDraft, setEventDraft] = useState<Partial<CalendarEvent>>({ title: "", start: "", end: "" });
  const queryClient = useQueryClient();

  const {
    data: localEvents = [],
    isLoading: loadingLocal,
    error: localError
  } = useQuery({ queryKey: ["local-events"], queryFn: fetchLocalEvents });

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
    if (!eventDraft.title || !eventDraft.start || !eventDraft.end) return;
    createEventMutation.mutate(eventDraft);
  };

  return (
    <div className="page calendar-page">
      <div className="calendar-page__left">
        <Card
          title={
            <CalendarHeader
              view={view}
              onViewChange={setView}
              onPrev={goPrev}
              onNext={goNext}
              onToday={goToToday}
              onAddTask={() => setSelectedTask({
                id: "", title: "", priority: "medium", status: "todo"
              })}
              onAddEvent={() => setShowEventForm((state) => !state)}
              onBookMeeting={() => setShowBooking(true)}
            />
          }
        >
          {loadingLocal && <AppLoading />}
          {localError && (
            <p className="text-red-700">{getErrorMessage(localError, "Unable to load calendar events.")}</p>
          )}
          {!loadingLocal && !localError && localEvents.length === 0 && (
            <p>No calendar events scheduled yet.</p>
          )}
          {!loadingLocal && !localError && (
            <CalendarView view={view} date={currentDate} localEvents={localEvents} />
          )}
          {showEventForm && (
            <div className="event-form" data-testid="event-form">
              <h4>Add Event</h4>
              <Input placeholder="Title" value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} />
              <Input type="datetime-local" value={eventDraft.start} onChange={(e) => setEventDraft({ ...eventDraft, start: e.target.value })} />
              <Input type="datetime-local" value={eventDraft.end} onChange={(e) => setEventDraft({ ...eventDraft, end: e.target.value })} />
              <Button onClick={handleAddEvent}>Save Event</Button>
            </div>
          )}
          {showBooking && (
            <div className="booking-modal" role="dialog">
              <div className="booking-modal__header">
                <h4>Book a Meeting</h4>
                <Button variant="secondary" onClick={() => setShowBooking(false)}>
                  Close
                </Button>
              </div>
              <div className="booking-modal__body">
                {meetingLinks.length === 0 && <p>No booking links configured.</p>}
                {meetingLinks.map((link) => (
                  <div key={link.userId} className="booking-link">
                    <div>{link.name}</div>
                    <a href={link.link} target="_blank" rel="noreferrer">
                      Open
                    </a>
                    <Button
                      variant="secondary"
                      onClick={() => navigator.clipboard.writeText(link.link)}
                      data-testid={`copy-${link.userId}`}
                    >
                      Copy Link
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
      <div className="calendar-page__right">
        <TaskPane />
      </div>
    </div>
  );
};

const CalendarPage = () => (
  <RequireRole roles={["Admin", "Staff"]}>
    <CalendarContent />
  </RequireRole>
);

export default CalendarPage;
