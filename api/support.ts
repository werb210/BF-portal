import api from "@api/client";

export async function getSupportQueue() {
  const res = await api.get("/api" + "/support/queue");
  return res.data;
}

export async function getIssueReports() {
  const res = await api.get("/api" + "/support/issues");
  return res.data;
}

export async function fetchIssueReports() {
  return api.get("/support/issues");
}

export async function getAIKnowledge() {
  const res = await api.get("/api" + "/ai/knowledge");
  return res.data;
}
