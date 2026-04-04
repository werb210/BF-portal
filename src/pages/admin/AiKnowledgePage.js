import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import RequireRole from "@/components/auth/RequireRole";
import { aiQueryKeys, deleteKnowledgeDocument, getKnowledgeDocuments, uploadKnowledgeDocument } from "@/services/aiService";
const categories = ["Product", "Lender", "Underwriting", "Process"];
const formatDateTime = (iso) => {
    if (!iso)
        return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        return "—";
    return date.toLocaleString();
};
const AiKnowledgeContent = () => {
    const queryClient = useQueryClient();
    const [category, setCategory] = useState("Product");
    const [isActive, setIsActive] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const { data: documents = [], isLoading } = useQuery({
        queryKey: aiQueryKeys.knowledge,
        queryFn: getKnowledgeDocuments
    });
    const uploadMutation = useMutation({
        mutationFn: uploadKnowledgeDocument,
        onSuccess: () => {
            setSelectedFile(null);
            void queryClient.invalidateQueries({ queryKey: aiQueryKeys.knowledge });
        }
    });
    const deleteMutation = useMutation({
        mutationFn: deleteKnowledgeDocument,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: aiQueryKeys.knowledge });
        }
    });
    const processingCount = useMemo(() => documents.filter((document) => document.status === "Processing").length, [documents]);
    const handleUpload = async (event) => {
        event.preventDefault();
        if (!selectedFile)
            return;
        await uploadMutation.mutateAsync({ file: selectedFile, category, isActive });
    };
    return (_jsxs("div", { className: "page space-y-4", children: [_jsxs(Card, { title: "AI Knowledge Admin", children: [_jsxs("form", { className: "grid gap-3 md:grid-cols-4", onSubmit: (event) => void handleUpload(event), children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", htmlFor: "ai-file-upload", children: "Upload PDF / DOCX / TXT" }), _jsx("input", { id: "ai-file-upload", type: "file", accept: ".pdf,.docx,.txt", onChange: (event) => setSelectedFile(event.target.files?.[0] ?? null), className: "block w-full rounded-md border border-slate-300 p-2 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", htmlFor: "ai-category-select", children: "Category" }), _jsx("select", { id: "ai-category-select", value: category, onChange: (event) => setCategory(event.target.value), className: "w-full rounded-md border border-slate-300 p-2 text-sm", children: categories.map((item) => (_jsx("option", { value: item, children: item }, item))) })] }), _jsxs("div", { className: "flex items-end gap-3", children: [_jsxs("label", { className: "inline-flex items-center gap-2 text-sm text-slate-700", children: [_jsx("input", { type: "checkbox", checked: isActive, onChange: (event) => setIsActive(event.target.checked), className: "h-4 w-4" }), "Active"] }), _jsx("button", { type: "submit", disabled: !selectedFile || uploadMutation.isPending, className: "rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50", children: uploadMutation.isPending ? "Uploading..." : "Upload" })] })] }), uploadMutation.isPending && (_jsxs("div", { className: "mt-3 flex items-center gap-2 text-sm text-slate-600", role: "status", children: [_jsx("span", { className: "h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" }), "Embedding progress spinner \u2022 Processing file"] }))] }), _jsxs(Card, { title: "Knowledge Documents", actions: _jsxs("span", { className: "text-sm text-slate-500", children: ["Processing: ", processingCount] }), children: [isLoading ? _jsx("p", { children: "Loading documents..." }) : null, !isLoading && documents.length === 0 ? _jsx("p", { children: "No documents indexed yet." }) : null, !isLoading && documents.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-slate-200 text-left text-slate-600", children: [_jsx("th", { className: "px-3 py-2", children: "Document" }), _jsx("th", { className: "px-3 py-2", children: "Category" }), _jsx("th", { className: "px-3 py-2", children: "Upload" }), _jsx("th", { className: "px-3 py-2", children: "OCR" }), _jsx("th", { className: "px-3 py-2", children: "Embedding" }), _jsx("th", { className: "px-3 py-2", children: "Active" }), _jsx("th", { className: "px-3 py-2", children: "Chunks" }), _jsx("th", { className: "px-3 py-2", children: "Last indexed" }), _jsx("th", { className: "px-3 py-2", children: "Action" })] }) }), _jsx("tbody", { children: documents.map((document) => (_jsxs("tr", { className: "border-b border-slate-100", children: [_jsx("td", { className: "px-3 py-2", children: document.name }), _jsx("td", { className: "px-3 py-2", children: document.category }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `rounded-full px-2 py-1 text-xs font-semibold ${document.status === "Embedded"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : document.status === "Failed"
                                                            ? "bg-rose-100 text-rose-700"
                                                            : "bg-amber-100 text-amber-700"}`, children: document.uploadStatus ?? "Uploaded" }) }), _jsx("td", { className: "px-3 py-2", children: document.ocrStatus ?? (document.status === "Embedded" ? "Processed" : "Pending") }), _jsx("td", { className: "px-3 py-2", children: document.embeddingStatus ?? document.status }), _jsx("td", { className: "px-3 py-2", children: document.isActive ? "Active" : "Inactive" }), _jsx("td", { className: "px-3 py-2", children: document.chunkCount }), _jsx("td", { className: "px-3 py-2", children: formatDateTime(document.lastIndexedAt) }), _jsx("td", { className: "px-3 py-2", children: _jsx("button", { type: "button", onClick: () => deleteMutation.mutate(document.id), className: "rounded border border-rose-300 px-2 py-1 text-xs text-rose-700", children: "Delete" }) })] }, document.id))) })] }) })) : null] })] }));
};
const AiKnowledgePage = () => (_jsx(RequireRole, { roles: ["Admin"], children: _jsx(AiKnowledgeContent, {}) }));
export default AiKnowledgePage;
