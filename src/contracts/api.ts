import { z } from "zod"

export const OtpStartSchema = z.object({
  phone: z.string().min(10)
})

export const OtpVerifySchema = z.object({
  phone: z.string(),
  code: z.string().length(6)
})
