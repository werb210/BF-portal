import { useQuery } from "@tanstack/react-query";
import { fetchDocumentVersions, restoreDocumentVersion, type DocumentVersion } from "@/api/documents";
import { getErrorMessage } from "@/utils/errors";

const DocumentVersionHistory = ({ documentId }: { documentId: string }) => {
  const { data: versions = [], isLoading, error } = useQuery<DocumentVersion[]>({
    queryKey: ["documents", documentId, "versions"],
    queryFn: ({ signal }) => fetchDocumentVersions(documentId, { signal }),
    enabled: Boolean(documentId)
  });

  if (isLoading) return <div className="drawer-placeholder">Loading version history…</div>;
  if (error) return <div className="drawer-placeholder">{getErrorMessage(error, "Unable to load versions.")}</div>;

  return (
    <div className="document-version-history">
      {versions.length ? (
        versions.map((version) => (
          <div key={version.id} className="document-version">
            <div>
              <div className="document-version__title">Version {version.version}</div>
              <div className="document-version__meta">Uploaded {version.uploadedAt}</div>
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => restoreDocumentVersion(documentId, version.version)}>
              Restore
            </button>
          </div>
        ))
      ) : (
        <div className="drawer-placeholder">No version history.</div>
      )}
    </div>
  );
};

export default DocumentVersionHistory;
