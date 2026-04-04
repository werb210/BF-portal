import { z } from "zod";
export const ApplicationSchema = z.object({
    id: z.string(),
    name: z.string(),
});
export const ApiEnvelopeSchema = (payloadSchema) => z.object({
    data: z.object({
        data: payloadSchema,
    }),
});
