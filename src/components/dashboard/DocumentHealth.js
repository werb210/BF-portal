import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { dashboardApi } from "@/api/dashboard";
const DocumentHealth = () => {
    const enableDashboardQueries = process.env.NODE_ENV !== "test";
    const { data, isLoading } = useQuery({ queryKey: ["dashboard", "document-health"], queryFn: dashboardApi.getDocumentHealth, enabled: enableDashboardQueries });
    return (_jsxs(Card, { title: "Document Health", children: [isLoading ? _jsx("p", { children: "Loading\u2026" }) : null, _jsxs("ul", { className: "space-y-1 text-sm", children: [_jsxs("li", { children: ["Missing bank statements: ", data?.missingBankStatements ?? 0] }), _jsxs("li", { children: ["Missing AR aging: ", data?.missingArAging ?? 0] }), _jsxs("li", { children: ["Rejected documents: ", data?.rejectedDocuments ?? 0] })] })] }));
};
export default DocumentHealth;
