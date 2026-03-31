import { z } from "zod";

export const ApplicationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ApiEnvelopeSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    data: z.object({
      data: payloadSchema,
    }),
  });
