import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserManagement from "../UserManagement";

const fetchUsers = vi.fn().mockResolvedValue(undefined);

vi.mock("@/state/settings.store", () => ({
  useSettingsStore: () => ({
    users: [],
    addUser: vi.fn(),
    updateUser: vi.fn(),
    updateUserRole: vi.fn(),
    setUserDisabled: vi.fn(),
    statusMessage: "",
    fetchUsers,
    isLoadingUsers: false,
  }),
}));

describe("UserManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Marketing role option and renders silo checkbox group", async () => {
    render(<UserManagement />);

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));

    expect(await screen.findByRole("option", { name: "Marketing" })).toBeInTheDocument();

    const bfCheckbox = screen.getByLabelText("BF — Boreal Financial") as HTMLInputElement;
    const biCheckbox = screen.getByLabelText("BI — Boreal Insurance") as HTMLInputElement;

    expect(bfCheckbox.checked).toBe(true);
    expect(biCheckbox.checked).toBe(false);

    fireEvent.click(biCheckbox);
    expect(biCheckbox.checked).toBe(true);
  });
});
