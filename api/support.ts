import api from "@api/client";

export async function getSupportQueue() {
  return [];
}

export async function getIssueReports() {
  return [];
}

export async function fetchIssueReports() {
  return [];
}

export async function getAIKnowledge() {
  const res = await api.get("/api" + "/ai/knowledge");
  return res.data;
}
