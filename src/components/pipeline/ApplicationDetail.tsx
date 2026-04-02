import { useEffect, useState } from "react";
import api from "@/lib/api";

type ApplicationDetailProps = {
  id: string;
  onClose: () => void;
};

type Application = {
  id: string;
  company: string;
  amount: string;
};

export default function ApplicationDetail({ id, onClose }: ApplicationDetailProps) {
  const [application, setApplication] = useState<Application | null>(null);

  useEffect(() => {
    const loadApplication = async () => {
      try {
        const response = await api.get<Application>(`/api/applications/${id}`);
        setApplication(response);
      } catch (e) {
        console.error(e);
        setApplication(null);
      }
    };

    loadApplication();
  }, [id]);

  if (!application) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        width: "400px",
        height: "100%",
        background: "#020c1c",
        padding: "20px",
        overflowY: "auto"
      }}
    >
      <button onClick={onClose}>Close</button>

      <h2>{application.company}</h2>

      <p>
        <strong>Amount:</strong> {application.amount}
      </p>

      <p>
        <strong>ID:</strong> {application.id}
      </p>
    </div>
  );
}
