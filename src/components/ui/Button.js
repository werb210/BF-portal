import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from "clsx";
const Button = ({ children, className, variant = "primary", ...props }) => {
    return (_jsx("button", { className: clsx("ui-button", {
            "ui-button--secondary": variant === "secondary",
            "ui-button--ghost": variant === "ghost"
        }, className), ...props, children: children }));
};
export default Button;
