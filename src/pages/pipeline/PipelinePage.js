import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getApplications } from "@/api/applications";
import ApplicationCard from "../../components/pipeline/ApplicationCard";
export default function PipelinePage() {
    const [pipeline, setPipeline] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const loadPipeline = async () => {
            try {
                const data = await getApplications();
                setPipeline(data || []);
            }
            catch (e) {
                console.error(e);
                throw new Error("Something failed. Check console.");
            }
            finally {
                setLoading(false);
            }
        };
        void loadPipeline();
    }, []);
    if (loading) {
        return _jsx("div", { children: "Loading pipeline..." });
    }
    return (_jsxs("div", { style: { padding: "20px" }, children: [_jsx("h1", { children: "Sales Pipeline" }), _jsx("div", { style: { display: "flex", gap: "20px", overflowX: "auto" }, children: pipeline.map((stage) => (_jsxs("div", { style: {
                        minWidth: "300px",
                        background: "#0f172a",
                        padding: "10px",
                        borderRadius: "8px"
                    }, children: [_jsx("h3", { children: stage.name }), (stage.cards || []).map((card) => (_jsx(ApplicationCard, { card: card }, card.id)))] }, stage.name))) })] }));
}
