import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fetchLenderCompany } from "@/api/lender/company";
import { fetchLenderProducts } from "@/api/lender/products";
const LenderDashboard = () => {
    const navigate = useNavigate();
    const { data: company } = useQuery({ queryKey: ["lender", "company"], queryFn: fetchLenderCompany });
    const { data: products } = useQuery({ queryKey: ["lender", "products"], queryFn: fetchLenderProducts });
    const activeCount = products?.filter((p) => p.active).length ?? 0;
    const inactiveCount = products?.length ? products.length - activeCount : 0;
    return (_jsxs("div", { className: "lender-card-grid", children: [_jsx(Card, { title: "Company", children: _jsxs("div", { className: "lender-section__content", children: [_jsx("div", { className: "lender-pill lender-pill--muted", children: company?.companyName ?? "Your company" }), _jsxs("div", { className: "text-sm text-slate-600", children: ["Last updated ", company?.updatedAt ? new Date(company.updatedAt).toLocaleDateString() : "-"] }), _jsx("div", { className: "lender-cta-row", children: _jsx(Button, { type: "button", onClick: () => navigate("/lender/company"), children: "Edit Company Info" }) })] }) }), _jsx(Card, { title: "Products", children: _jsxs("div", { className: "lender-section__content", children: [_jsxs("div", { className: "lender-pill lender-pill--success", children: ["Active: ", activeCount] }), _jsxs("div", { className: "lender-pill", children: ["Inactive: ", inactiveCount] }), _jsxs("div", { className: "text-sm text-slate-600", children: ["Total products: ", products?.length ?? 0] }), _jsx("div", { className: "lender-cta-row", children: _jsx(Button, { type: "button", onClick: () => navigate("/lender/products"), children: "Manage Products" }) })] }) })] }));
};
export default LenderDashboard;
