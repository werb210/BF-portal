import { useState } from "react";
import { api } from "@/api";

type ScoringResponse = {
  score?: number;
  rating?: string;
};

export default function CapitalScorePreview() {
  const [score, setScore] = useState<ScoringResponse | null>(null);

  async function testScore() {
    const data = await api<ScoringResponse>("/scoring", {
      method: "POST",
      body: {
        revenue: 200000,
        timeInBusiness: 36,
        creditScore: 700,
      },
    });

    setScore(data);
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={testScore}
        className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
      >
        Test Scoring
      </button>
      {score && (
        <div>
          <p>Score: {score.score}</p>
          <p>Rating: {score.rating}</p>
        </div>
      )}
    </div>
  );
}
