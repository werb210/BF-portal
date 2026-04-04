import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import AppLoading from "@/components/layout/AppLoading";
import LenderLayout from "@/lender/layout/LenderLayout";
import LenderLoginPage from "@/lender/auth/LenderLoginPage";
import LenderOtpPage from "@/lender/auth/LenderOtpPage";
import LenderDashboard from "@/lender/dashboard/LenderDashboard";
import CompanyEditor from "@/lender/company/CompanyEditor";
import ProductsPage from "@/lender/products/ProductsPage";
import { LenderAuthProvider } from "@/lender/auth/LenderAuthContext";
import { useLenderAuth } from "@/lender/auth/useLenderAuth";
const LenderPrivateRoute = () => {
    const { isAuthenticated, isLoading } = useLenderAuth();
    const location = useLocation();
    if (isLoading) {
        return (_jsx("div", { className: "route-guard", children: _jsx(AppLoading, {}) }));
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/lender/login", state: { from: location }, replace: true });
    }
    return _jsx(Outlet, {});
};
const LenderRoutes = () => (_jsx(LenderAuthProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/lender/login", element: _jsx(LenderLoginPage, {}) }), _jsx(Route, { path: "/lender/otp", element: _jsx(LenderOtpPage, {}) }), _jsx(Route, { element: _jsx(LenderPrivateRoute, {}), children: _jsxs(Route, { path: "/lender", element: _jsx(LenderLayout, {}), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/lender/dashboard", replace: true }) }), _jsx(Route, { path: "/lender/dashboard", element: _jsx(LenderDashboard, {}) }), _jsx(Route, { path: "/lender/company", element: _jsx(CompanyEditor, {}) }), _jsx(Route, { path: "/lender/products", element: _jsx(ProductsPage, {}) })] }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/lender/login", replace: true }) })] }) }));
export default LenderRoutes;
