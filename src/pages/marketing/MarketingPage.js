import { jsx as _jsx } from "react/jsx-runtime";
import Card from "@/components/ui/Card";
import RequireRole from "@/components/auth/RequireRole";
import MarketingDashboard from "./MarketingDashboard";
const MarketingPage = () => {
    return (_jsx(RequireRole, { roles: ["Admin"], message: "This space is limited to Admins.", children: _jsx("div", { className: "page", children: _jsx(Card, { title: "Marketing", children: _jsx(MarketingDashboard, {}) }) }) }));
};
export default MarketingPage;
