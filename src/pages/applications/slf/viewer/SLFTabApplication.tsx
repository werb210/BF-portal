import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@api/httpClient";

const API_PREFIX = "/api";
type SLFApplication = {
  businessInfo?: Record<string, unknown>;
  applicantInfo?: Record<string, unknown>;
  fundingRequest?: Record<string, unknown>;
  financialSnapshot?: Record<string, unknown>;
  contact?: Record<string, unknown>;
};

const SLFTabApplication = ({ applicationId }: { applicationId: string }) => {
  const { data: application = {}, isLoading } = useQuery<SLFApplication>({
    queryKey: ["slf", "application", applicationId],
    queryFn: ({ signal }) => apiClient.get(`${API_PREFIX}/slf/applications/${applicationId}`, { signal })
  });

  if (isLoading) {
    return <div>Loading application data...</div>;
  }

  return (
    <div className="slf-application-view">
      <h3>Business Info</h3>
      <pre>{JSON.stringify(application.businessInfo ?? {}, null, 2)}</pre>
      <h3>Applicant Info</h3>
      <pre>{JSON.stringify(application.applicantInfo ?? {}, null, 2)}</pre>
      <h3>Funding Request</h3>
      <pre>{JSON.stringify(application.fundingRequest ?? {}, null, 2)}</pre>
      <h3>Financial Snapshot</h3>
      <pre>{JSON.stringify(application.financialSnapshot ?? {}, null, 2)}</pre>
      <h3>Contact</h3>
      <pre>{JSON.stringify(application.contact ?? {}, null, 2)}</pre>
    </div>
  );
};

export default SLFTabApplication;
