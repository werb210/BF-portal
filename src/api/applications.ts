import { z } from "zod";
import api from "@/api/client";
import { ApiEnvelopeSchema, ApplicationSchema } from "@/api/schemas";
import { requireAuth } from "@/utils/requireAuth";

const ApplicationListEnvelopeSchema = ApiEnvelopeSchema(z.array(ApplicationSchema));
const ApplicationEnvelopeSchema = ApiEnvelopeSchema(ApplicationSchema);

export const getApplications = async () => {
  requireAuth();

  const { data } = await api.get("/api/applications", { schema: ApplicationListEnvelopeSchema });
  return data.data;
};

export const sendToLender = async (id: string, lenders: string[]) => {
  requireAuth();

  const { data } = await api.post(
    `/api/applications/${id}/send`,
    {
      lenders,
    },
    { schema: ApplicationEnvelopeSchema },
  );

  return data.data;
};

export const createApplication = async (payload: unknown) => {
  requireAuth();
  const { data } = await api.post("/api/applications", payload, { schema: ApplicationEnvelopeSchema });
  return data.data;
};
