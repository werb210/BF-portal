import api from "@/lib/api";
import { requireAuth } from "@/utils/requireAuth";

export const getApplications = async () => {
  requireAuth();

  const { data } = await api.get("/api/applications");
  return data.data;
};

export const sendToLender = async (id: string, lenders: string[]) => {
  requireAuth();

  const { data } = await api.post(`/api/applications/${id}/send`, {
    lenders,
  });

  return data.data;
};

export const createApplication = async (payload: unknown) => {
  requireAuth();
  const { data } = await api.post("/api/applications", payload);
  return data.data;
};
