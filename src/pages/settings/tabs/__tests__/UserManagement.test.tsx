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

// BF_PORTAL_v909_ADD_USER_DIRECT_NUMBER
import { waitFor } from "@testing-library/react";
import { api } from "@/api";

describe("Add user: direct phone number", () => {
  it("offers the free numbers and assigns the chosen one to the new user", async () => {
    const get = vi.spyOn(api, "get").mockImplementation(async (url: string) => (url === "/api/voice/available-numbers" ? { configured: true, numbers: [{ number: "+15875550123", label: "Edmonton 2" }] } : {}) as never);
    const post = vi.spyOn(api, "post").mockResolvedValue({ ok: true, user: { id: "u-new" } } as never);
    const put = vi.spyOn(api, "put").mockResolvedValue({ ok: true } as never);
    render(<UserManagement />);
    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    const picker = await screen.findByLabelText("Assign a direct phone number (optional)");
    await screen.findByRole("option", { name: "+15875550123 (Edmonton 2)" });
    fireEvent.change(picker, { target: { value: "+15875550123" } });
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Lee" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@example.com" } });
    const addButtons = screen.getAllByRole("button", { name: "Add user" });
    fireEvent.click(addButtons[addButtons.length - 1]!);
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/users", expect.any(Object)));
    await waitFor(() => expect(put).toHaveBeenCalledWith("/api/voice/direct-numbers/u-new", { direct_number: "+15875550123" }));
    expect(get).toHaveBeenCalledWith("/api/voice/available-numbers");
  });
});
