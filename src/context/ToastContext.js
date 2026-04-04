import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Toast from "../components/Toast";
import { subscribeToToasts } from "../utils/toastEvents";
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);
    const showToast = useCallback((message, variant = "success") => {
        setToast({ message, variant });
        setTimeout(() => setToast(null), 4000);
    }, []);
    const showSuccess = (message) => showToast(message, "success");
    const showError = (message) => showToast(message, "error");
    useEffect(() => subscribeToToasts(showToast), [showToast]);
    return (_jsxs(ToastContext.Provider, { value: { showToast, showSuccess, showError }, children: [children, toast ? _jsx(Toast, { message: toast.message, variant: toast.variant }) : null] }));
}
export function useToast() {
    return useContext(ToastContext);
}
