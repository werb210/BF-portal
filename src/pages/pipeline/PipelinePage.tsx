import { useEffect, useState } from "react";
import { getApplications } from "@api/applications";
import ApplicationCard from "../../components/pipeline/ApplicationCard";

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPipeline = async () => {
      try {
        const data = await getApplications();
        setPipeline(data || []);
      } catch (e) {
        console.error(e);
        alert("Something failed. Check console.");
      } finally {
        setLoading(false);
      }
    };

    loadPipeline();
  }, []);

  if (loading) {
    return <div>Loading pipeline...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Sales Pipeline</h1>

      <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
        {pipeline.map((stage: any) => (
          <div
            key={stage.name}
            style={{
              minWidth: "300px",
              background: "#0f172a",
              padding: "10px",
              borderRadius: "8px"
            }}
          >
            <h3>{stage.name}</h3>

            {(stage.cards || []).map((card: any) => (
              <ApplicationCard key={card.id} card={card} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
