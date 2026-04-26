import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarPage from "@/pages/calendar/CalendarPage";

vi.mock("@/components/auth/RequireRole", () => ({ default: ({ children }: any) => children }));
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
    render(<CalendarPage />);
    fireEvent.click(screen.getByRole("button", { name: /Add Event/i }));
    const start = screen.getByLabelText(/Start/i);
    const end = screen.getByLabelText(/End/i);
    expect(start).toHaveAttribute("type", "datetime-local");
    expect(end).toHaveAttribute("type", "datetime-local");
    expect((start as HTMLInputElement).style.color).toBe("rgb(0, 0, 0)");
  });
});
