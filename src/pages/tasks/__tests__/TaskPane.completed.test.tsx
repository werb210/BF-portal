import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskItem } from "@/api/tasks";
import { fetchTasks } from "@/api/tasks";
import { useTasksStore } from "@/state/tasks.store";
import TaskPane from "../TaskPane";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Andrew" } }),
}));

vi.mock("@/api/tasks", async () => {
  const actual = await vi.importActual<typeof import("@/api/tasks")>("@/api/tasks");
  return {
    ...actual,
    fetchTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
  };
});

const mockFetchTasks = vi.mocked(fetchTasks);

const tasks: TaskItem[] = [
  {
    id: "my-open",
    title: "Call today",
    priority: "medium",
    status: "todo",
    assignedToUserId: "user-1",
  },
  {
    id: "my-done",
    title: "File completed form",
    priority: "low",
    status: "done",
    assignedToUserId: "user-1",
  },
  {
    id: "assigned-open",
    title: "Review application",
    priority: "high",
    status: "in-progress",
    assignedToUserId: "user-2",
  },
  {
    id: "assigned-done",
    title: "Archive old note",
    priority: "low",
    status: "done",
    assignedToUserId: "user-2",
  },
];

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function sectionNamed(name: string) {
  const heading = screen.getByRole("heading", { name });
  const section = heading.closest("section");
  if (!section) throw new Error(`Missing section for ${name}`);
  return within(section);
}

describe("TaskPane completed task collapse", () => {
  beforeEach(() => {
    mockFetchTasks.mockResolvedValue(tasks);
    useTasksStore.setState({
      selectedTask: undefined,
      filters: { mine: false, createdByMe: false, overdue: false, silo: undefined },
    });
  });

  it("hides completed My Tasks and Assigned Tasks until each Completed toggle expands", async () => {
    const user = userEvent.setup();

    renderWithQueryClient(<TaskPane />);

    const myTasks = sectionNamed("My Tasks");
    expect(await myTasks.findByText("Call today")).toBeInTheDocument();
    expect(myTasks.queryByText("File completed form")).not.toBeInTheDocument();
    expect(myTasks.getByRole("button", { name: "Expand 1 completed tasks" })).toHaveTextContent("Completed (1)");

    const assignedTasks = sectionNamed("Assigned Tasks");
    expect(await assignedTasks.findByText("Review application")).toBeInTheDocument();
    expect(assignedTasks.queryByText("Archive old note")).not.toBeInTheDocument();
    expect(assignedTasks.getByRole("button", { name: "Expand 1 completed tasks" })).toHaveTextContent("Completed (1)");

    await user.click(myTasks.getByRole("button", { name: "Expand 1 completed tasks" }));
    expect(myTasks.getByText("File completed form")).toBeInTheDocument();
    expect(assignedTasks.queryByText("Archive old note")).not.toBeInTheDocument();

    await user.click(assignedTasks.getByRole("button", { name: "Expand 1 completed tasks" }));
    expect(assignedTasks.getByText("Archive old note")).toBeInTheDocument();
  });
});
