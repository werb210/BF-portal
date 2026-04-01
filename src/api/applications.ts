import { z } from "zod";
import api from "@/api/client";
import { ApiEnvelopeSchema, ApplicationSchema } from "@/api/schemas";
import { requireAuth } from "@/utils/requireAuth";

const ApplicationListEnvelopeSchema = ApiEnvelopeSchema(z.array(ApplicationSchema));
const ApplicationEnvelopeSchema = ApiEnvelopeSchema(ApplicationSchema);

export const getApplications = async () => {
  requireAuth();

  const response = await api.get<unknown[]>("/api/applications", { schema: ApplicationListEnvelopeSchema });
  if (!response.success) {
    throw new Error(response.message);
  }

  return response.data;
};

export const sendToLender = async (id: string, lenders: string[]) => {
  requireAuth();

  const response = await api.post<unknown>(
    `/api/applications/${id}/send`,
    {
      lenders,
    },
    { schema: ApplicationEnvelopeSchema },
  );

  if (!response.success) {
    throw new Error(response.message);
  }

  return response.data;
};

export const createApplication = async (payload: unknown) => {
  requireAuth();
  const response = await api.post<unknown>("/api/applications", payload, { schema: ApplicationEnvelopeSchema });
  if (!response.success) {
    throw new Error(response.message);
  }

  return response.data;
};
