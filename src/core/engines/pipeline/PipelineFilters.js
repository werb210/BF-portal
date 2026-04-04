import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { usePipelineStore } from "./pipeline.store";
import { SUBMISSION_METHOD_LABELS } from "@/utils/submissionMethods";
const PipelineFilters = ({ stages }) => {
    const filters = usePipelineStore((state) => state.currentFilters);
    const setFilters = usePipelineStore((state) => state.setFilters);
    const resetFilters = usePipelineStore((state) => state.resetFilters);
    const stageOptions = [{ value: "", label: "All stages" }, ...stages.map((stage) => ({
            value: stage.id,
            label: stage.label
        }))];
    return (_jsxs("div", { className: "pipeline-filters", children: [_jsx(Input, { label: "Search", placeholder: "Business or applicant name", value: filters.searchTerm ?? "", onChange: (event) => setFilters({ searchTerm: event.target.value }) }), _jsx(Select, { label: "Stage", value: filters.stageId ?? "", onChange: (event) => setFilters({ stageId: event.target.value || undefined }), options: stageOptions }), _jsx(Select, { label: "Product Type", value: filters.productCategory ?? "", onChange: (event) => setFilters({ productCategory: event.target.value || undefined }), options: [
                    { value: "", label: "All" },
                    { value: "startup", label: "Start-Up" },
                    { value: "sba", label: "SBA" },
                    { value: "term-loan", label: "Term Loan" }
                ] }), _jsx(Select, { label: "Submission Method", value: filters.submissionMethod ?? "", onChange: (event) => setFilters({ submissionMethod: event.target.value || undefined }), options: [
                    { value: "", label: "Any" },
                    { value: "API", label: SUBMISSION_METHOD_LABELS.API },
                    { value: "EMAIL", label: SUBMISSION_METHOD_LABELS.EMAIL },
                    { value: "GOOGLE_SHEET", label: SUBMISSION_METHOD_LABELS.GOOGLE_SHEET }
                ] }), _jsx(Input, { label: "Lender Assigned", placeholder: "Lender name", value: filters.lenderAssigned ?? "", onChange: (event) => setFilters({ lenderAssigned: event.target.value || undefined }) }), _jsx(Select, { label: "Lender Status", value: filters.lenderStatus ?? "", onChange: (event) => setFilters({
                    lenderStatus: event.target.value ? event.target.value : undefined
                }), options: [
                    { value: "", label: "Any" },
                    { value: "assigned", label: "Assigned" },
                    { value: "unassigned", label: "Unassigned" }
                ] }), _jsx(Select, { label: "Processing Status", value: filters.processingStatus ?? "", onChange: (event) => setFilters({
                    processingStatus: event.target.value ? event.target.value : undefined
                }), options: [
                    { value: "", label: "Any" },
                    { value: "OCR", label: "Pending" },
                    { value: "BANKING", label: "In progress" },
                    { value: "DONE", label: "Complete" }
                ] }), _jsxs("div", { className: "pipeline-filters__dates", children: [_jsx(Input, { label: "From", type: "date", value: filters.dateFrom ?? "", onChange: (event) => setFilters({ dateFrom: event.target.value || undefined }) }), _jsx(Input, { label: "To", type: "date", value: filters.dateTo ?? "", onChange: (event) => setFilters({ dateTo: event.target.value || undefined }) })] }), _jsx(Select, { label: "Sort", value: filters.sort ?? "updated_desc", onChange: (event) => setFilters({ sort: event.target.value }), options: [
                    { value: "updated_desc", label: "Updated Date (Newest)" },
                    { value: "updated_asc", label: "Updated Date (Oldest)" },
                    { value: "amount_desc", label: "Requested Amount (High)" },
                    { value: "amount_asc", label: "Requested Amount (Low)" },
                    { value: "stage", label: "Stage" }
                ] }), _jsx("button", { className: "ui-button ui-button--ghost pipeline-filters__reset", onClick: resetFilters, type: "button", children: "Reset Filters" })] }));
};
export default PipelineFilters;
