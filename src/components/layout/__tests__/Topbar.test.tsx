import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/state/notifications.store", () => ({
  useNotificationsStore: (selector: (state: { notifications: Array<{ read: boolean }> }) => number) =>
    selector({ notifications: [] }),
}));

vi.mock("@/components/BusinessUnitSelector", () => ({
  default: () => <div data-testid="business-unit-selector" />,
}));

vi.mock("@/components/notifications/NotificationCenter", () => ({
  default: () => <div data-testid="notification-center" />,
}));

vi.mock("@/components/MayaStatus", () => ({
  default: () => <div data-testid="maya-status" />,
}));

vi.mock("@/api", () => {
  const fn = vi.fn(() => Promise.resolve({ status: "ok" }));
  fn.post = vi.fn(() => Promise.resolve({}));
  return { api: fn };
});

import Topbar from "@/components/layout/Topbar";

describe("Topbar greeting", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("renders firstName greeting", () => {
    useAuthMock.mockReturnValue({ user: { firstName: "Todd" }, logout: vi.fn() });

    render(
      <MemoryRouter>
        <Topbar onToggleSidebar={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Hello, Todd" })).toBeInTheDocument();
  });

  it("renders snake_case first_name greeting", () => {
    useAuthMock.mockReturnValue({ user: { first_name: "Todd" }, logout: vi.fn() });

    render(
      <MemoryRouter>
        <Topbar onToggleSidebar={() => {}} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Hello, Todd" })).toBeInTheDocument();
  });
});
