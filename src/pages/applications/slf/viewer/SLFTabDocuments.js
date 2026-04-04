import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
const API_PREFIX = "";
const SLFTabDocuments = ({ applicationId }) => {
    const { data: docs = [], isLoading } = useQuery({
        queryKey: ["slf", "documents", applicationId],
        queryFn: ({ signal }) => api.get(`${API_PREFIX}/slf/applications/${applicationId}/documents`, { signal })
    });
    const handleView = async (docId) => {
        const presign = await api.get(`${API_PREFIX}/slf/documents/${docId}/presign`);
        const url = presign.url;
        if (url) {
            window.open(url, "_blank");
        }
    };
    if (isLoading)
        return _jsx("div", { children: "Loading documents..." });
    return (_jsxs("div", { className: "slf-documents", children: [!docs?.length && _jsx("div", { children: "No documents uploaded." }), _jsx("ul", { children: docs?.map((doc) => (_jsxs("li", { className: "document-row", children: [_jsxs("div", { children: [_jsx("div", { className: "document-title", children: doc.type }), _jsx("div", { className: "document-meta", children: doc.filename }), _jsxs("div", { className: "document-meta", children: ["Uploaded ", new Date(doc.uploadedAt).toLocaleString()] })] }), _jsxs("div", { className: "document-actions", children: [_jsx("button", { className: "btn", onClick: () => handleView(doc.id), children: "View" }), _jsx("a", { className: "btn btn-secondary", href: doc.downloadUrl ?? doc.url, download: true, children: "Download" })] })] }, doc.id))) })] }));
};
export default SLFTabDocuments;
