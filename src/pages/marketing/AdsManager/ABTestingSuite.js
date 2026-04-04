import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import { useQuery } from "@tanstack/react-query";
import { fetchABTests } from "@/api/marketing.ads";
const ABTestingSuite = () => {
    const { data, isLoading } = useQuery({ queryKey: ["ab-tests"], queryFn: fetchABTests });
    return (_jsxs(Card, { title: "A/B Testing Suite", children: [isLoading && _jsx(AppLoading, {}), !isLoading && (_jsxs(Table, { headers: ["Ad", "Platform", "Metric", "Variant A", "Variant B", "Winner"], children: [(data || []).map((test) => {
                        const [variantA, variantB] = test.variants;
                        if (!variantA || !variantB) {
                            return null;
                        }
                        const winner = (test.metric === "clicks" ? variantA.clicks : variantA.conversions) >=
                            (test.metric === "clicks" ? variantB.clicks : variantB.conversions)
                            ? variantA
                            : variantB;
                        return (_jsxs("tr", { children: [_jsx("td", { children: test.adId }), _jsx("td", { children: test.platform }), _jsx("td", { className: "capitalize", children: test.metric }), _jsxs("td", { children: [_jsx("div", { children: variantA.headline }), _jsxs("div", { className: "text-muted text-xs", children: ["Clicks ", variantA.clicks, " / Conv. ", variantA.conversions] })] }), _jsxs("td", { children: [_jsx("div", { children: variantB.headline }), _jsxs("div", { className: "text-muted text-xs", children: ["Clicks ", variantB.clicks, " / Conv. ", variantB.conversions] })] }), _jsx("td", { children: winner.headline })] }, test.id));
                    }), !data?.length && (_jsx("tr", { children: _jsx("td", { colSpan: 6, children: "No tests running." }) }))] }))] }));
};
export default ABTestingSuite;
