import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@api/httpClient";

const API_PREFIX = "";
type SLFDocument = {
  id: string;
  type: string;
  filename: string;
  uploadedAt: string;
  downloadUrl?: string;
  url?: string;
};

const SLFTabDocuments = ({ applicationId }: { applicationId: string }) => {
  const { data: docs = [], isLoading } = useQuery<SLFDocument[]>({
    queryKey: ["slf", "documents", applicationId],
    queryFn: ({ signal }) =>
      apiClient.get<SLFDocument[]>(`${API_PREFIX}/slf/applications/${applicationId}/documents`, { signal })
  });

  const handleView = async (docId: string) => {
    const presign = await apiClient.get<{ url?: string }>(`${API_PREFIX}/slf/documents/${docId}/presign`);
    const url = presign.url;
    if (url) {
      window.open(url, "_blank");
    }
  };

  if (isLoading) return <div>Loading documents...</div>;

  return (
    <div className="slf-documents">
      {!docs?.length && <div>No documents uploaded.</div>}
      <ul>
        {docs?.map((doc) => (
          <li key={doc.id} className="document-row">
            <div>
              <div className="document-title">{doc.type}</div>
              <div className="document-meta">{doc.filename}</div>
              <div className="document-meta">Uploaded {new Date(doc.uploadedAt).toLocaleString()}</div>
            </div>
            <div className="document-actions">
              <button className="btn" onClick={() => handleView(doc.id)}>
                View
              </button>
              <a className="btn btn-secondary" href={doc.downloadUrl ?? doc.url} download>
                Download
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SLFTabDocuments;
