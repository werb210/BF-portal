import { z } from "zod";
import api from "@/api/client";
import { ApiEnvelopeSchema, ApplicationSchema } from "@/api/schemas";
import { requireAuth } from "@/utils/requireAuth";

const ApplicationListEnvelopeSchema = ApiEnvelopeSchema(z.array(ApplicationSchema));
const ApplicationEnvelopeSchema = ApiEnvelopeSchema(ApplicationSchema);

export const getApplications = async () => {
  requireAuth();

  const response = await api.get<{ data?: { data?: unknown[] } }>("/api/applications", { schema: ApplicationListEnvelopeSchema });
  return response?.data?.data ?? [];
};

export const sendToLender = async (id: string, lenders: string[]) => {
  requireAuth();

  const response = await api.post<{ data?: unknown }>(
    `/api/applications/${id}/send`,
    {
      lenders,
    },
    { schema: ApplicationEnvelopeSchema },
  );

  return response?.data ?? null;
};

export const createApplication = async (payload: unknown) => {
  requireAuth();
  const response = await api.post<{ data?: unknown }>("/api/applications", payload, { schema: ApplicationEnvelopeSchema });
  return response?.data ?? null;
};
