import { z } from 'zod'

export const authSearchSchema = z.object({
  redirect: z.string().startsWith('/').optional().catch(undefined),
  motivo: z.literal('expirada').optional().catch(undefined),
})
