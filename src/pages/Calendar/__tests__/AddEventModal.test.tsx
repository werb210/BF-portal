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
  it("uses datetime-local inputs with readable black text", () => {
    render(
      <MemoryRouter initialEntries={["/calendar"]}>
        <CalendarPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add Event/i }));
    const start = screen.getByLabelText(/Start/i);
    const end = screen.getByLabelText(/End/i);
    expect(start).toHaveAttribute("type", "datetime-local");
    expect(end).toHaveAttribute("type", "datetime-local");
    expect((start as HTMLInputElement).style.color).toBe("var(--ui-text)");
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
