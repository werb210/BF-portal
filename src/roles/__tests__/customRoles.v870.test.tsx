// BF_PORTAL_v870_CRM_DATA_MODEL - the permission store (nothing hidden until the server answers), the role editor and the
// role dropdown body.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put, patch: h.patch } }));

import RolesSettings from "../RolesSettings";
import { __setPermissionsForTests, can, normalizeMe, normalizePermissionSet, AREAS, ACTIONS, type PermissionSet } from "../permissionStore";
import { bodyForChoice, choiceForUser, type RoleRow } from "../rolesApi";
import { roleOptions } from "../useRoleChoices";

const full = (): PermissionSet => normalizePermissionSet(Object.fromEntries(AREAS.map((a) => [a, Object.fromEntries(ACTIONS.map((x) => [x, true]))])));
const staff = (): PermissionSet => { const p = full(); p.users = { view: false, create: false, edit: false, delete: false, export: false }; return p; };

const tpl = (name: "Admin" | "Ops" | "Staff" | "Marketing", p: PermissionSet): RoleRow => ({
  id: `builtin:${name}`, name, description: null, base_role: name, permissions: p, record_visibility: "all", users: 1, built_in: true, read_only: true,
});
const overview = () => ({
  templates: [tpl("Admin", full()), tpl("Ops", full()), tpl("Staff", staff()), tpl("Marketing", staff())],
  roles: [{ id: "r1", name: "Viewer", description: null, base_role: "Staff", permissions: staff(), record_visibility: "own", users: 2, built_in: false, read_only: false, archived_at: null }],
});

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset(); h.patch.mockReset();
  __setPermissionsForTests(null);
});

describe("permission store", () => {
  it("hides nothing until the server answers, then follows the role", () => {
    expect(can("contacts", "delete")).toBe(true);
    const me = normalizeMe({ ok: true, role: "Staff", permissions: { contacts: { view: true } }, custom_role: { id: "r1", name: "Viewer", base_role: "Staff" }, record_visibility: "own" });
    __setPermissionsForTests(me);
    expect(can("contacts", "view")).toBe(true);
    expect(can("contacts", "delete")).toBe(false);
    expect(can("marketing", "view")).toBe(false);
    expect(normalizeMe({ ok: false })).toBeNull();
  });
});

describe("role dropdown", () => {
  it("lists built-in roles then active custom roles; a custom choice sends its base role and id", () => {
    const roles = overview().roles as RoleRow[];
    expect(roleOptions(roles).map((o) => o.label)).toEqual(["Admin", "Staff", "Marketing", "Viewer (custom)"]);
    expect(bodyForChoice("custom:r1", roles)).toEqual({ role: "Staff", custom_role_id: "r1" });
    expect(bodyForChoice("builtin:Marketing", roles)).toEqual({ role: "Marketing" });
    expect(choiceForUser({ role: "Staff", custom_role_id: "r1" })).toBe("custom:r1");
    expect(choiceForUser({ role: "admin" })).toBe("builtin:Admin");
  });
});

describe("Settings > Users & roles > Roles", () => {
  it("shows built-in roles read-only and creates a custom role from a template", async () => {
    h.get.mockResolvedValue(overview());
    h.post.mockResolvedValue({ role: { id: "r2" }, dropped: [] });
    render(<RolesSettings />);
    const adminRow = await screen.findByTestId("role-row-builtin:Admin");
    expect(within(adminRow).getByText("(built-in, read-only)")).toBeInTheDocument();
    expect(within(adminRow).queryByRole("button", { name: "Edit" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New role" }));
    const editor = screen.getByTestId("role-editor");
    fireEvent.change(within(editor).getByLabelText("Name"), { target: { value: "Junior" } });
    // Staff cannot manage users: those boxes are greyed out.
    expect(within(editor).getByLabelText("View users, teams and roles")).toBeDisabled();
    fireEvent.click(within(editor).getByLabelText("Delete contacts"));
    fireEvent.click(within(editor).getByRole("button", { name: "Create role" }));
    await waitFor(() => expect(h.post).toHaveBeenCalled());
    const [path, body] = h.post.mock.calls[0]!;
    expect(path).toBe("/api/roles");
    expect(body).toMatchObject({ name: "Junior", base_role: "Staff", record_visibility: "all" });
    expect(body.permissions.contacts.delete).toBe(false);
    expect(body.permissions.contacts.view).toBe(true);
  });

  it("people who are not a full Admin see the roles but cannot change them", async () => {
    __setPermissionsForTests(normalizeMe({ ok: true, role: "Admin", full_admin: false, permissions: full(), custom_role: { id: "r9", name: "Office", base_role: "Admin" } }));
    h.get.mockResolvedValue(overview());
    render(<RolesSettings />);
    await screen.findByTestId("role-row-r1");
    expect(screen.queryByRole("button", { name: "New role" })).toBeNull();
    expect(screen.getByText(/Only an Admin can create or change roles/)).toBeInTheDocument();
  });
});
