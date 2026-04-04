import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
export default function CreditResults() {
    const navigate = useNavigate();
    const data = JSON.parse(sessionStorage.getItem("creditReadiness") || "{}");
    const moveToApplication = () => {
        navigate("/apply", { state: data });
    };
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "Your Credit Profile Summary" }), _jsx("pre", { children: JSON.stringify(data, null, 2) }), _jsx("button", { onClick: moveToApplication, children: "Continue to Full Application" })] }));
}
