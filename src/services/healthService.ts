import { apiClient } from "../lib/apiClient";

export async function checkServerHealth() {
  const res = await apiClient.get("/health");
  return res.data;
}
