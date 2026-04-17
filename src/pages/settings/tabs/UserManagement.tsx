import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { useSettingsStore, type AdminUser } from "@/state/settings.store";
import { getErrorMessage } from "@/utils/errors";
import UserDetailsFields from "../components/UserDetailsFields";

const UserManagement = () => {
  const {
    users,
    addUser,
    updateUser,
    updateUserRole,
    setUserDisabled,
    statusMessage,
    fetchUsers,
    isLoadingUsers
  } = useSettingsStore();
  type UserFormState = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: AdminUser["role"];
  };

  const [userForm, setUserForm] = useState<UserFormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "Staff"
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [pendingUserIds, setPendingUserIds] = useState<Set<string>>(new Set());

  const visibleUsers = useMemo(() => users, [users]);
  const safeUsers = Array.isArray(visibleUsers) ? visibleUsers : [];

  const splitName = (name?: string) => {
    const normalized = name?.trim() ?? "";
    if (!normalized) return { firstName: "", lastName: "" };
    const [firstName, ...rest] = normalized.split(" ");
    return { firstName: firstName ?? "", lastName: rest.join(" ") };
  };

  useEffect(() => {
    let isMounted = true;
    fetchUsers().catch((error) => {
      if (!isMounted) return;
      setFormError(getErrorMessage(error, "Unable to load users."));
    });
    return () => {
      isMounted = false;
    };
  }, [fetchUsers]);

  const validateUserForm = () => {
    const errors: Record<string, string> = {};
    if (!userForm.firstName.trim()) errors.firstName = "First name is required.";
    if (!userForm.lastName.trim()) errors.lastName = "Last name is required.";
    if (!userForm.email.trim()) {
      errors.email = "Email is required.";
    } else if (!userForm.email.includes("@")) {
      errors.email = "Enter a valid email.";
    }
    return errors;
  };

  const setUserPending = (id: string, pending: boolean) => {
    setPendingUserIds((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const onSubmitUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const errors = validateUserForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setIsSavingUser(true);
    try {
      if (editingUser) {
        if (!editingUser.id) {
          setFormError("Missing user id. Please refresh and try again.");
          return;
        }
        await updateUser(editingUser.id, userForm);
      } else {
        await addUser({ ...userForm });
      }
      await fetchUsers();
      setUserForm({ firstName: "", lastName: "", email: "", phone: "", role: "Staff" });
      setEditingUser(null);
      setIsModalOpen(false);
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to save user."));
    } finally {
      setIsSavingUser(false);
    }
  };

  const onLoadUsers = async () => {
    setFormError(null);
    try {
      await fetchUsers();
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to load users."));
    }
  };

  const onUpdateRole = async (id: string, role: AdminUser["role"]) => {
    if (!role) return;
    if (!id) {
      setFormError("Missing user id. Please refresh and try again.");
      return;
    }
    setFormError(null);
    setUserPending(id, true);
    try {
      await updateUserRole(id, role);
      await fetchUsers();
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to update user role."));
    } finally {
      setUserPending(id, false);
    }
  };

  const onToggleDisabled = async (id: string, disabled: boolean) => {
    if (!id) {
      setFormError("Missing user id. Please refresh and try again.");
      return;
    }
    setFormError(null);
    setUserPending(id, true);
    try {
      await setUserDisabled(id, disabled);
      await fetchUsers();
    } catch (error) {
      setFormError(getErrorMessage(error, "Unable to update user status."));
    } finally {
      setUserPending(id, false);
    }
  };

  return (
    <section className="settings-panel" aria-label="User management">
      <header>
        <h2>Admin: User Management</h2>
        <p>
          Add users, set roles, and manage access. Admins add a user, and the user logs in via OTP to finish their
          profile.
        </p>
      </header>

      {formError && <ErrorBanner message={formError} />}

      <div className="settings-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onLoadUsers}
          disabled={isLoadingUsers}
          title={isLoadingUsers ? "User list is refreshing." : undefined}
        >
          {isLoadingUsers ? "Refreshing..." : "Refresh users"}
        </Button>
        <Button
          type="button"
          disabled={isLoadingUsers}
          title={isLoadingUsers ? "User list is refreshing." : undefined}
          onClick={() => {
            setEditingUser(null);
            setFormErrors({});
            setUserForm({ firstName: "", lastName: "", email: "", phone: "", role: "Staff" });
            setIsModalOpen(true);
          }}
        >
          Add user
        </Button>
      </div>

      <div className="user-management__table">
        <Table headers={["Name", "Role", "Status", "Actions"]}>
          {safeUsers.map((user, index) => {
            const userId = user.id ?? "";
            const rowKey = userId || `user-${index}`;
            const safeEmail = user.email ?? "";
            const displayName =
              `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
              user.name ||
              (safeEmail ? safeEmail.split("@")[0] : "Unknown user");
            const statusLabel = user.disabled ? "Disabled" : "Active";
            const roleValue = user.role === "Admin" || user.role === "Staff" ? user.role : "Staff";
            const isPending = userId ? pendingUserIds.has(userId) : false;
            return (
              <tr key={rowKey}>
                <td>
                  <div className="user-table__name">{displayName}</div>
                  <div className="user-table__email">{user.email}</div>
                </td>
                <td>
                  <Select
                    label="Role"
                    value={roleValue}
                    onChange={(e) => onUpdateRole(userId, e.target.value as AdminUser["role"])}
                    options={[
                      { value: "Admin", label: "Admin" },
                      { value: "Staff", label: "Staff" }
                    ]}
                    hideLabel
                    disabled={isLoadingUsers || isPending || !userId}
                  />
                </td>
                <td>
                  <span className={`status-pill status-pill--${statusLabel.toLowerCase()}`}>{statusLabel}</span>
                </td>
                <td className="user-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onToggleDisabled(userId, !user.disabled)}
                    disabled={isLoadingUsers || isPending || !userId}
                    title={isPending ? "User update in progress." : isLoadingUsers ? "User updates are refreshing." : undefined}
                  >
                    {isPending ? "Updating..." : user.disabled ? "Enable" : "Disable"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!userId}
                    onClick={() => {
                      const fallbackName = splitName(user.name);
                      setEditingUser(user);
                      setFormErrors({});
                      setUserForm({
                        firstName: user.firstName ?? fallbackName.firstName,
                        lastName: user.lastName ?? fallbackName.lastName,
                        email: user.email ?? "",
                        phone: user.phone ?? "",
                        role: roleValue
                      });
                      setIsModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            );
          })}
          {safeUsers.length === 0 && (
            <tr>
              <td colSpan={4}>No users have been added yet.</td>
            </tr>
          )}
        </Table>
      </div>

      <div className="user-management__cards">
          {safeUsers.map((user, index) => {
            const userId = user.id ?? "";
            const cardKey = userId || `user-${index}`;
            const safeEmail = user.email ?? "";
            const displayName =
              `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
              user.name ||
              (safeEmail ? safeEmail.split("@")[0] : "Unknown user");
            const statusLabel = user.disabled ? "Disabled" : "Active";
            const roleValue = user.role === "Admin" || user.role === "Staff" ? user.role : "Staff";
            const isPending = userId ? pendingUserIds.has(userId) : false;
            return (
            <div key={cardKey} className="user-card">
              <div className="user-card__header">
                <div>
                  <div className="user-card__name">{displayName}</div>
                  <div className="user-card__email">{user.email}</div>
                </div>
                <span className={`status-pill status-pill--${statusLabel.toLowerCase()}`}>{statusLabel}</span>
              </div>
              <div className="user-card__body">
                <Select
                  label="Role"
                  value={roleValue}
                  onChange={(e) => onUpdateRole(userId, e.target.value as AdminUser["role"])}
                  options={[
                    { value: "Admin", label: "Admin" },
                    { value: "Staff", label: "Staff" }
                  ]}
                  disabled={isLoadingUsers || isPending || !userId}
                />
                <div className="user-card__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onToggleDisabled(userId, !user.disabled)}
                    disabled={isLoadingUsers || isPending || !userId}
                    title={isPending ? "User update in progress." : isLoadingUsers ? "User updates are refreshing." : undefined}
                  >
                    {isPending ? "Updating..." : user.disabled ? "Enable" : "Disable"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!userId}
                    onClick={() => {
                      const fallbackName = splitName(user.name);
                      setEditingUser(user);
                      setFormErrors({});
                      setUserForm({
                        firstName: user.firstName ?? fallbackName.firstName,
                        lastName: user.lastName ?? fallbackName.lastName,
                        email: user.email ?? "",
                        phone: user.phone ?? "",
                        role: roleValue
                      });
                      setIsModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {safeUsers.length === 0 && <div className="user-card user-card--empty">No users have been added yet.</div>}
      </div>

      {statusMessage && <div role="status">{statusMessage}</div>}

      {isModalOpen && (
        <Modal title={editingUser ? "Edit user" : "Add user"} onClose={() => setIsModalOpen(false)}>
          <form className="settings-grid modal-form" onSubmit={onSubmitUser} aria-label="Add user form">
            <UserDetailsFields
              firstName={userForm.firstName}
              lastName={userForm.lastName}
              email={userForm.email}
              phone={userForm.phone ?? ""}
              errors={formErrors}
              onChange={(updates) => setUserForm((prev) => ({ ...prev, ...updates }))}
            />
            <Select
              label="Role"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as AdminUser["role"] })}
              options={[
                { value: "Admin", label: "Admin" },
                { value: "Staff", label: "Staff" }
              ]}
            />
            <div className="settings-actions">
              <Button
                type="submit"
                disabled={isLoadingUsers || isSavingUser}
                title={isSavingUser || isLoadingUsers ? "Saving user." : undefined}
              >
                {isSavingUser || isLoadingUsers ? "Saving..." : editingUser ? "Save changes" : "Add user"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

export default UserManagement;
