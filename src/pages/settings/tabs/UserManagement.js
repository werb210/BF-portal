import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { useSettingsStore } from "@/state/settings.store";
import { getErrorMessage } from "@/utils/errors";
import UserDetailsFields from "../components/UserDetailsFields";
const UserManagement = () => {
    const { users, addUser, updateUser, updateUserRole, setUserDisabled, statusMessage, fetchUsers, isLoadingUsers } = useSettingsStore();
    const [userForm, setUserForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "Staff"
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formError, setFormError] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [editingUser, setEditingUser] = useState(null);
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [pendingUserIds, setPendingUserIds] = useState(new Set());
    const visibleUsers = useMemo(() => users, [users]);
    const safeUsers = Array.isArray(visibleUsers) ? visibleUsers : [];
    const splitName = (name) => {
        const normalized = name?.trim() ?? "";
        if (!normalized)
            return { firstName: "", lastName: "" };
        const [firstName, ...rest] = normalized.split(" ");
        return { firstName: firstName ?? "", lastName: rest.join(" ") };
    };
    useEffect(() => {
        let isMounted = true;
        fetchUsers().catch((error) => {
            if (!isMounted)
                return;
            setFormError(getErrorMessage(error, "Unable to load users."));
        });
        return () => {
            isMounted = false;
        };
    }, [fetchUsers]);
    const validateUserForm = () => {
        const errors = {};
        if (!userForm.firstName.trim())
            errors.firstName = "First name is required.";
        if (!userForm.lastName.trim())
            errors.lastName = "Last name is required.";
        if (!userForm.email.trim()) {
            errors.email = "Email is required.";
        }
        else if (!userForm.email.includes("@")) {
            errors.email = "Enter a valid email.";
        }
        return errors;
    };
    const setUserPending = (id, pending) => {
        setPendingUserIds((prev) => {
            const next = new Set(prev);
            if (pending) {
                next.add(id);
            }
            else {
                next.delete(id);
            }
            return next;
        });
    };
    const onSubmitUser = async (event) => {
        event.preventDefault();
        setFormError(null);
        const errors = validateUserForm();
        setFormErrors(errors);
        if (Object.keys(errors).length > 0)
            return;
        setIsSavingUser(true);
        try {
            if (editingUser) {
                if (!editingUser.id) {
                    setFormError("Missing user id. Please refresh and try again.");
                    return;
                }
                await updateUser(editingUser.id, userForm);
            }
            else {
                await addUser({ ...userForm });
            }
            await fetchUsers();
            setUserForm({ firstName: "", lastName: "", email: "", phone: "", role: "Staff" });
            setEditingUser(null);
            setIsModalOpen(false);
        }
        catch (error) {
            setFormError(getErrorMessage(error, "Unable to save user."));
        }
        finally {
            setIsSavingUser(false);
        }
    };
    const onLoadUsers = async () => {
        setFormError(null);
        try {
            await fetchUsers();
        }
        catch (error) {
            setFormError(getErrorMessage(error, "Unable to load users."));
        }
    };
    const onUpdateRole = async (id, role) => {
        if (!role)
            return;
        if (!id) {
            setFormError("Missing user id. Please refresh and try again.");
            return;
        }
        setFormError(null);
        setUserPending(id, true);
        try {
            await updateUserRole(id, role);
            await fetchUsers();
        }
        catch (error) {
            setFormError(getErrorMessage(error, "Unable to update user role."));
        }
        finally {
            setUserPending(id, false);
        }
    };
    const onToggleDisabled = async (id, disabled) => {
        if (!id) {
            setFormError("Missing user id. Please refresh and try again.");
            return;
        }
        setFormError(null);
        setUserPending(id, true);
        try {
            await setUserDisabled(id, disabled);
            await fetchUsers();
        }
        catch (error) {
            setFormError(getErrorMessage(error, "Unable to update user status."));
        }
        finally {
            setUserPending(id, false);
        }
    };
    return (_jsxs("section", { className: "settings-panel", "aria-label": "User management", children: [_jsxs("header", { children: [_jsx("h2", { children: "Admin: User Management" }), _jsx("p", { children: "Add users, set roles, and manage access. Admins add a user, and the user logs in via OTP to finish their profile." })] }), formError && _jsx(ErrorBanner, { message: formError }), _jsxs("div", { className: "settings-actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onLoadUsers, disabled: isLoadingUsers, title: isLoadingUsers ? "User list is refreshing." : undefined, children: isLoadingUsers ? "Refreshing..." : "Refresh users" }), _jsx(Button, { type: "button", disabled: isLoadingUsers, title: isLoadingUsers ? "User list is refreshing." : undefined, onClick: () => {
                            setEditingUser(null);
                            setFormErrors({});
                            setUserForm({ firstName: "", lastName: "", email: "", phone: "", role: "Staff" });
                            setIsModalOpen(true);
                        }, children: "Add user" })] }), _jsx("div", { className: "user-management__table", children: _jsxs(Table, { headers: ["Name", "Role", "Status", "Actions"], children: [safeUsers.map((user, index) => {
                            const userId = user.id ?? "";
                            const rowKey = userId || `user-${index}`;
                            const safeEmail = user.email ?? "";
                            const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                                user.name ||
                                (safeEmail ? safeEmail.split("@")[0] : "Unknown user");
                            const statusLabel = user.disabled ? "Disabled" : "Active";
                            const roleValue = user.role === "Admin" || user.role === "Staff" ? user.role : "Staff";
                            const isPending = userId ? pendingUserIds.has(userId) : false;
                            return (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("div", { className: "user-table__name", children: displayName }), _jsx("div", { className: "user-table__email", children: user.email })] }), _jsx("td", { children: _jsx(Select, { label: "Role", value: roleValue, onChange: (e) => onUpdateRole(userId, e.target.value), options: [
                                                { value: "Admin", label: "Admin" },
                                                { value: "Staff", label: "Staff" }
                                            ], hideLabel: true, disabled: isLoadingUsers || isPending || !userId }) }), _jsx("td", { children: _jsx("span", { className: `status-pill status-pill--${statusLabel.toLowerCase()}`, children: statusLabel }) }), _jsxs("td", { className: "user-actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => onToggleDisabled(userId, !user.disabled), disabled: isLoadingUsers || isPending || !userId, title: isPending ? "User update in progress." : isLoadingUsers ? "User updates are refreshing." : undefined, children: isPending ? "Updating..." : user.disabled ? "Enable" : "Disable" }), _jsx(Button, { type: "button", variant: "ghost", disabled: !userId, onClick: () => {
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
                                                }, children: "Edit" })] })] }, rowKey));
                        }), safeUsers.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, children: "No users have been added yet." }) }))] }) }), _jsxs("div", { className: "user-management__cards", children: [safeUsers.map((user, index) => {
                        const userId = user.id ?? "";
                        const cardKey = userId || `user-${index}`;
                        const safeEmail = user.email ?? "";
                        const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                            user.name ||
                            (safeEmail ? safeEmail.split("@")[0] : "Unknown user");
                        const statusLabel = user.disabled ? "Disabled" : "Active";
                        const roleValue = user.role === "Admin" || user.role === "Staff" ? user.role : "Staff";
                        const isPending = userId ? pendingUserIds.has(userId) : false;
                        return (_jsxs("div", { className: "user-card", children: [_jsxs("div", { className: "user-card__header", children: [_jsxs("div", { children: [_jsx("div", { className: "user-card__name", children: displayName }), _jsx("div", { className: "user-card__email", children: user.email })] }), _jsx("span", { className: `status-pill status-pill--${statusLabel.toLowerCase()}`, children: statusLabel })] }), _jsxs("div", { className: "user-card__body", children: [_jsx(Select, { label: "Role", value: roleValue, onChange: (e) => onUpdateRole(userId, e.target.value), options: [
                                                { value: "Admin", label: "Admin" },
                                                { value: "Staff", label: "Staff" }
                                            ], disabled: isLoadingUsers || isPending || !userId }), _jsxs("div", { className: "user-card__actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => onToggleDisabled(userId, !user.disabled), disabled: isLoadingUsers || isPending || !userId, title: isPending ? "User update in progress." : isLoadingUsers ? "User updates are refreshing." : undefined, children: isPending ? "Updating..." : user.disabled ? "Enable" : "Disable" }), _jsx(Button, { type: "button", variant: "ghost", disabled: !userId, onClick: () => {
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
                                                    }, children: "Edit" })] })] })] }, cardKey));
                    }), safeUsers.length === 0 && _jsx("div", { className: "user-card user-card--empty", children: "No users have been added yet." })] }), statusMessage && _jsx("div", { role: "status", children: statusMessage }), isModalOpen && (_jsx(Modal, { title: editingUser ? "Edit user" : "Add user", onClose: () => setIsModalOpen(false), children: _jsxs("form", { className: "settings-grid modal-form", onSubmit: onSubmitUser, "aria-label": "Add user form", children: [_jsx(UserDetailsFields, { firstName: userForm.firstName, lastName: userForm.lastName, email: userForm.email, phone: userForm.phone ?? "", errors: formErrors, onChange: (updates) => setUserForm((prev) => ({ ...prev, ...updates })) }), _jsx(Select, { label: "Role", value: userForm.role, onChange: (e) => setUserForm({ ...userForm, role: e.target.value }), options: [
                                { value: "Admin", label: "Admin" },
                                { value: "Staff", label: "Staff" }
                            ] }), _jsxs("div", { className: "settings-actions", children: [_jsx(Button, { type: "submit", disabled: isLoadingUsers || isSavingUser, title: isSavingUser || isLoadingUsers ? "Saving user." : undefined, children: isSavingUser || isLoadingUsers ? "Saving..." : editingUser ? "Save changes" : "Add user" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setIsModalOpen(false), children: "Cancel" })] })] }) }))] }));
};
export default UserManagement;
