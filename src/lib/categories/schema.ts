import { z } from 'zod'

export const categorySchema = z.object({
    name: z.string().min(1),
    type: z.enum(['income', 'expense']),
    description: z.string().optional().nullable(),
    default_budget: z.number().optional().nullable(),
    budget_period_months: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(12),
    ]).optional(),
    sort_order: z.number().int().optional(),
})
