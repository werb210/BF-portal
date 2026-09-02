import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import CalendarPage from "@/pages/calendar/CalendarPage";

vi.mock("@/components/auth/RequireRole", () => ({ default: ({ children }: any) => children }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", name: "Current User" } }) }));
vi.mock("@/api", () => ({ api: { get: vi.fn(() => Promise.resolve({ tasks: [], queues: [], staff: [] })), post: vi.fn(() => Promise.resolve({})) } }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("react-big-calendar", () => ({
  Calendar: () => <div>calendar</div>,
  dateFnsLocalizer: () => ({}),
}));

describe("Add Event modal", () => {
  // BF_PORTAL_CAL_DATETIMEPICKER_v1 - Start/End now use the shared DateTimePicker
  // (calendar popover), not raw datetime-local inputs.
  it("renders the Add Event modal with Start and End date pickers", () => {
    render(
      <MemoryRouter initialEntries={["/calendar"]}>
        <CalendarPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add Event/i }));
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
  });
});


describe("Create task dialog (HubSpot panel)", () => {
  it("opens the HubSpot-style create dialog with type + assignee", () => {
    render(
      <MemoryRouter initialEntries={["/calendar"]}>
        <CalendarPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Create task/i }));
    expect(screen.getByText("Task type")).toBeInTheDocument();
    expect(screen.getByText("Assigned to")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(2);
  });
});
