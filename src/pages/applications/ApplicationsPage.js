import { jsx as _jsx } from "react/jsx-runtime";
import PipelinePage from "@/core/engines/pipeline/PipelinePage";
import { PipelineEngineProvider } from "@/core/engines/pipeline/PipelineEngineProvider";
import { bfPipelineAdapter } from "@/silos/bf/bf.pipeline.adapter";
import { slfPipelineAdapter } from "@/silos/slf/slf.pipeline.adapter";
import { useSilo } from "@/hooks/useSilo";
import RequireRole from "@/components/auth/RequireRole";
const ApplicationsContent = () => {
    const { silo } = useSilo();
    if (silo === "SLF") {
        return (_jsx(PipelineEngineProvider, { config: {
                businessUnit: "SLF",
                api: slfPipelineAdapter,
            }, children: _jsx(PipelinePage, {}) }));
    }
    return (_jsx(PipelineEngineProvider, { config: {
            businessUnit: "BF",
            api: bfPipelineAdapter
        }, children: _jsx(PipelinePage, {}) }));
};
const ApplicationsPage = () => (_jsx(RequireRole, { roles: ["Admin", "Staff"], children: _jsx(ApplicationsContent, {}) }));
export default ApplicationsPage;
