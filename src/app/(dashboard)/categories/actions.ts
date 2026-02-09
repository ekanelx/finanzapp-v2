'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { categorySchema } from '@/lib/categories/schema'
import { z } from 'zod'

export async function createCategory(data: any) {
    const supabase = await createClient()

    // Get Household
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single()
    if (!member) return { error: "Sin hogar" }

    const validation = categorySchema.safeParse(data)
    if (!validation.success) return { error: "Datos inválidos" }

    const { error } = await supabase
        .from('categories')
        .insert({
            ...validation.data,
            household_id: member.household_id
        })

    if (error) return { error: error.message }

    revalidatePath('/')
    revalidatePath('/budget')
    revalidatePath('/transactions')
    return { success: true }
}

export async function updateCategory(id: string, data: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Fetch member for household_id
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single()
    if (!member) return { error: "Sin hogar" }

    // Reuse schema (partial)
    const updateSchema = categorySchema.partial()

    const validation = updateSchema.safeParse(data)
    if (!validation.success) return { error: "Datos inválidos" }

    // Update Category
    const { error } = await supabase
        .from('categories')
        .update(validation.data)
        .eq('id', id)

    if (error) {
        console.error('Update category error:', error)
        return { error: error.message }
    }

    // --- SYNC WITH CURRENT BUDGET ---
    // Update the budget line for the current month if defaults changed
    if (validation.data.default_budget !== undefined || validation.data.periodicity !== undefined) {
        try {
            // 1. Get fresh category data
            const { data: cat } = await supabase.from('categories').select('*').eq('id', id).single()

            if (cat && cat.type === 'expense') {
                // 2. Calculate monthly amount
                let monthlyAmount = Number(cat.default_budget) || 0
                if (cat.periodicity === 'bimonthly') monthlyAmount /= 2
                if (cat.periodicity === 'quarterly') monthlyAmount /= 3
                if (cat.periodicity === 'yearly') monthlyAmount /= 12

                // 3. Determine current month range (Client Local Time Simulation)
                const now = new Date()
                // Use simple string construction to avoid UTC shifts
                const year = now.getFullYear()
                const month = String(now.getMonth() + 1).padStart(2, '0')

                // Range: First day of current month to... let's say last day of next month to be safe? 
                // Or just the whole current month.
                const startStr = `${year}-${month}-01`

                // Last day of current month
                const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
                const endStr = `${year}-${month}-${lastDay}`

                // 4. Find active budgets for this month (returns array)
                const { data: budgets } = await supabase
                    .from('budgets')
                    .select('id, month')
                    .eq('household_id', member.household_id)
                    .gte('month', startStr)
                    .lte('month', endStr)

                if (budgets && budgets.length > 0) {
                    for (const budget of budgets) {
                        // 5. Explicit SELECT then UPDATE/INSERT
                        const { data: existingLine } = await supabase
                            .from('budget_lines')
                            .select('id, amount')
                            .eq('budget_id', budget.id)
                            .eq('category_id', id)
                            .eq('scope', 'shared')
                            .is('member_id', null)
                            .maybeSingle()

                        if (existingLine) {
                            await supabase
                                .from('budget_lines')
                                .update({ amount: monthlyAmount })
                                .eq('id', existingLine.id)

                        } else {
                            await supabase
                                .from('budget_lines')
                                .insert({
                                    budget_id: budget.id,
                                    category_id: id,
                                    amount: monthlyAmount,
                                    scope: 'shared'
                                })
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[Sync] Error syncing budget:', err)
            // Silently fail or log to server, but don't crash user flow
        }
    }

    revalidatePath('/')
    revalidatePath('/budget')
    revalidatePath('/transactions')
    return { success: true }
}

export async function deleteCategory(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Delete category error:', error)
        return { error: error.message }
    }

    revalidatePath('/')
    revalidatePath('/budget')
    revalidatePath('/transactions')
    return { success: true }
}

export async function updateCategoryOrder(items: { id: string, sort_order: number }[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const updates = items.map(item =>
        supabase.from('categories').update({ sort_order: item.sort_order }).eq('id', item.id)
    )

    await Promise.all(updates)

    revalidatePath('/budget')
    return { success: true }
}
