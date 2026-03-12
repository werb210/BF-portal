import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar
} from "recharts";
import apiClient from "@/api/client";

interface OverviewData {
  autonomy: any;
  recentActions: any[];
  clusterDistribution: any[];
  confidenceTrend?: any[];
  lenderAccuracy?: any[];
  fundingHeatmap?: any[];
  staffPerformance?: any[];
  modelVersions?: any[];
}

const COLORS = ["#4f46e5", "#16a34a", "#dc2626", "#f59e0b"];

export default function MayaIntelligence() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [roiInput, setRoiInput] = useState(10000);
  const [roiProjection, setRoiProjection] = useState<number | null>(null);

  useEffect(() => {
    apiClient.get("/api/maya/overview")
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, []);

  async function simulateROI() {
    const res = await apiClient.post("/api/maya/roi-simulate", { budget: roiInput });
    setRoiProjection(res.data.projectedRevenue);
  }

  async function rollbackModel(version: string) {
    await apiClient.post("/api/maya/model-rollback", { version });
    alert("Model rolled back.");
  }

  if (!data) return <div>Loading Maya Intelligence...</div>;

  return (
    <div className="p-6 space-y-14">
      <h1 className="text-2xl font-bold">Maya Executive Intelligence</h1>

      {data.clusterDistribution?.length ? (
        <Card>
          <h2 className="font-semibold mb-2">Cluster Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.clusterDistribution} dataKey="count" nameKey="label" outerRadius={100}>
                {data.clusterDistribution.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      ) : null}

      {data.fundingHeatmap && (
        <Card>
          <h2 className="font-semibold mb-2">Funding Probability Heatmap</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.fundingHeatmap}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="riskBand" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="probability" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {data.confidenceTrend && (
        <Card>
          <h2 className="font-semibold mb-2">Confidence Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.confidenceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="confidence" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold mb-2">ROI Forecast Simulator</h2>
        <input
          type="number"
          value={roiInput}
          onChange={(e) => setRoiInput(Number(e.target.value))}
          className="border p-2"
        />
        <Button className="ml-3" onClick={simulateROI}>
          Simulate
        </Button>
        {roiProjection && (
          <p className="mt-2">
            Projected Revenue: ${roiProjection.toLocaleString()}
          </p>
        )}
      </Card>

      {data.staffPerformance && (
        <Card>
          <h2 className="font-semibold mb-2">Staff Performance Correlation</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.staffPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="staff" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="closeRate" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {data.modelVersions && (
        <Card>
          <h2 className="font-semibold mb-2">ML Model Versions</h2>
          <table className="w-full border">
            <thead>
              <tr>
                <th>Version</th>
                <th>Accuracy</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.modelVersions.map((v, i) => (
                <tr key={i}>
                  <td>{v.version}</td>
                  <td>{v.accuracy}%</td>
                  <td>{new Date(v.created_at).toLocaleDateString()}</td>
                  <td>
                    <Button variant="secondary" onClick={() => rollbackModel(v.version)}>
                      Rollback
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
