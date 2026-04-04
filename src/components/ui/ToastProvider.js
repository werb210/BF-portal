import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Toaster } from "react-hot-toast";
const ToastProvider = ({ children }) => (_jsxs(_Fragment, { children: [children, _jsx(Toaster, { position: "top-right", toastOptions: { duration: 4000 } })] }));
export default ToastProvider;
