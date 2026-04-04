import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { fetchDocumentVersions, restoreDocumentVersion } from "@/api/documents";
import { getErrorMessage } from "@/utils/errors";
const DocumentVersionHistory = ({ documentId }) => {
    const { data: versions = [], isLoading, error } = useQuery({
        queryKey: ["documents", documentId, "versions"],
        queryFn: ({ signal }) => fetchDocumentVersions(documentId, { signal }),
        enabled: Boolean(documentId)
    });
    if (isLoading)
        return _jsx("div", { className: "drawer-placeholder", children: "Loading version history\u2026" });
    if (error)
        return _jsx("div", { className: "drawer-placeholder", children: getErrorMessage(error, "Unable to load versions.") });
    return (_jsx("div", { className: "document-version-history", children: versions.length ? (versions.map((version) => (_jsxs("div", { className: "document-version", children: [_jsxs("div", { children: [_jsxs("div", { className: "document-version__title", children: ["Version ", version.version] }), _jsxs("div", { className: "document-version__meta", children: ["Uploaded ", version.uploadedAt] })] }), _jsx("button", { type: "button", className: "btn btn--ghost", onClick: () => restoreDocumentVersion(documentId, version.version), children: "Restore" })] }, version.id)))) : (_jsx("div", { className: "drawer-placeholder", children: "No version history." })) }));
};
export default DocumentVersionHistory;
