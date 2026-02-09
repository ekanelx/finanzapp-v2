import { z } from 'zod'

export const categorySchema = z.object({
    name: z.string().min(1),
    type: z.enum(['income', 'expense']),
    description: z.string().optional().nullable(),
    default_budget: z.number().optional().nullable(),
    periodicity: z.enum(['monthly', 'bimonthly', 'quarterly', 'yearly']).default('monthly').optional(),
    icon: z.string().optional().nullable(),
    sort_order: z.number().default(0).optional(),
})
