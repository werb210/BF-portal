import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import DialerPanel from "./dialer/DialerPanel";
export default function DialerButton() {
    const [open, setOpen] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setOpen(!open), style: {
                    position: "fixed",
                    bottom: "20px",
                    right: "20px",
                    padding: "15px"
                }, children: "Dialer" }), open && _jsx(DialerPanel, {})] }));
}
