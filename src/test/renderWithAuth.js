import { jsx as _jsx } from "react/jsx-runtime";
import { render } from "@testing-library/react";
import { TestAuthProvider } from "./TestAuthProvider";
export function renderWithAuth(ui, role = "Admin") {
    return render(_jsx(TestAuthProvider, { role: role, children: ui }));
}
