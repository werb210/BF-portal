import { jsx as _jsx } from "react/jsx-runtime";
import { MemoryRouter } from "react-router-dom";
export function TestAppWrapper({ children, initialEntries = ["/"] }) {
    return _jsx(MemoryRouter, { initialEntries: initialEntries, children: children });
}
