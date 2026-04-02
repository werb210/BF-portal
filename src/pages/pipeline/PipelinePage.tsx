import { useEffect, useState } from "react";
import { getApplications } from "@/api/applications";
import ApplicationCard from "../../components/pipeline/ApplicationCard";

type PipelineCard = {
  id: string;
  company: string;
  amount: string;
};

type PipelineStage = {
  name: string;
  cards?: PipelineCard[];
};

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPipeline = async () => {
      try {
        const data = await getApplications();
        setPipeline((data as unknown as PipelineStage[]) || []);
      } catch (e) {
        console.error(e);
        throw new Error("Something failed. Check console.");
      } finally {
        setLoading(false);
      }
    };

    void loadPipeline();
  }, []);

  if (loading) {
    return <div>Loading pipeline...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Sales Pipeline</h1>

      <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
        {pipeline.map((stage) => (
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

            {(stage.cards || []).map((card) => (
              <ApplicationCard key={card.id} card={card} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
