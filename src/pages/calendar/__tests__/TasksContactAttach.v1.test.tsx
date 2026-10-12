// BF_PORTAL_UNIFIED_TASK_MODAL_v1 - all task create surfaces use the shared rich modal.
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ComponentProps } from "react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn, postOrQueue: vi.fn() };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));
vi.mock("@/offline/outbox", () => ({ postOrQueue: h.postOrQueue }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/dialer/actions", () => ({ startOutboundPstn: vi.fn() }));
// The real shared modal, wrapped in a marker so a screen that opened some other local dialog is caught.
vi.mock("@/components/tasks/TaskModal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/tasks/TaskModal")>();
  const Real = actual.default;
  return { default: (props: ComponentProps<typeof Real>) => <div data-testid="shared-task-modal"><Real {...props} /></div> };
});

import TaskModal from "@/components/tasks/TaskModal";
import CalendarTasksPanel from "@/pages/calendar/CalendarTasksPanel";
import TasksPage from "@/pages/tasks/TasksPage";
import { ActionBar } from "@/components/crm/ActionBar";

beforeEach(() => {
  for (const m of [h.apiFn, h.apiFn.get, h.apiFn.post, h.postOrQueue]) m.mockReset();
  h.apiFn.get.mockImplementation(async (url: string) => {
    if (url === "/api/tasks/queues") return { queues: [{ id: "q1", name: "Renewals" }] };
    if (url === "/api/tasks/staff") return { staff: [{ id: "me", name: "Todd" }, { id: "s2", name: "Andrew" }] };
    if (url === "/api/crm/contacts") return [{ id: "ct1", name: "Jane Client", email: "jane@example.com", phone: null }];
    if (url.startsWith("/api/tasks")) return { tasks: [] };
    return {};
  });
  h.postOrQueue.mockResolvedValue({ ok: true });
});

function lastTaskPost() {
  const call = h.postOrQueue.mock.calls.find((c: unknown[]) => c[0] === "/api/tasks");
  return call?.[1] as Record<string, unknown> | undefined;
}

describe("unified task modal contact attachment", () => {
  it("shared modal owns contact picking, queue/staff loading, and /api/tasks creation", async () => {
    const onCreated = vi.fn();
    render(<TaskModal onClose={vi.fn()} onCreated={onCreated} />);
    expect(await screen.findByRole("option", { name: "Renewals" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Andrew" })).toBeInTheDocument();
    expect(h.apiFn.get).toHaveBeenCalledWith("/api/tasks/queues");
    expect(h.apiFn.get).toHaveBeenCalledWith("/api/tasks/staff");

    fireEvent.change(screen.getByPlaceholderText("Enter your task"), { target: { value: "Call Jane back" } });
    fireEvent.change(screen.getByPlaceholderText(/Search contacts/), { target: { value: "jane" } });
    fireEvent.click(await screen.findByRole("button", { name: /Jane Client/ }));
    expect(h.apiFn.get).toHaveBeenCalledWith("/api/crm/contacts", { params: { q: "jane", limit: 8 } });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(lastTaskPost()).toMatchObject({ title: "Call Jane back", type: "CALL", contact_id: "ct1", company_id: null });
  });

  it("refuses a call task with no contact", async () => {
    render(<TaskModal onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Enter your task"), { target: { value: "Call someone" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("need a contact");
    expect(h.postOrQueue).not.toHaveBeenCalled();
  });

  it("calendar and tasks page use TaskModal instead of local create dialogs", async () => {
    const { unmount } = render(<MemoryRouter><CalendarTasksPanel currentUserId="me" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(within(screen.getByTestId("shared-task-modal")).getByPlaceholderText("Enter your task")).toBeInTheDocument();
    unmount();

    render(<MemoryRouter><TasksPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "+ Create task" }));
    expect(within(screen.getByTestId("shared-task-modal")).getByPlaceholderText("Enter your task")).toBeInTheDocument();
  });

  it("CRM action bar locks the current contact into TaskModal", async () => {
    render(<ActionBar scope={{ kind: "contact", id: "c9" }} contactName="Jane Client" contactEmail="jane@example.com" onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Task" }));
    const modal = screen.getByTestId("shared-task-modal");
    expect(within(modal).getByText("Jane Client")).toBeInTheDocument();
    expect(within(modal).queryByPlaceholderText(/Search contacts/)).not.toBeInTheDocument();
    expect(within(modal).queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
    fireEvent.change(within(modal).getByPlaceholderText("Enter your task"), { target: { value: "Email the quote" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Create" }));
    await waitFor(() => expect(lastTaskPost()).toMatchObject({ contact_id: "c9", company_id: null }));
  });

  it("CRM action bar locks the current company into TaskModal", async () => {
    render(<ActionBar scope={{ kind: "company", id: "co7" }} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Task" }));
    const modal = screen.getByTestId("shared-task-modal");
    fireEvent.change(within(modal).getByPlaceholderText("Enter your task"), { target: { value: "Review file" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Create" }));
    await waitFor(() => expect(lastTaskPost()).toMatchObject({ company_id: "co7", contact_id: null }));
  });

  it("the old TaskPopup is gone", () => {
    const popups = Object.keys(import.meta.glob("../../../components/crm/popups/*.tsx"));
    expect(popups.some((p) => p.endsWith("/MeetingPopup.tsx"))).toBe(true);
    expect(popups.some((p) => p.endsWith("/TaskPopup.tsx"))).toBe(false);
  });
});
