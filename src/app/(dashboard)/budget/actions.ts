'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createBudget(monthStr?: string, shouldRedirect: boolean = true) {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 2. Get Household
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) return { error: 'No household found' }

    const householdId = member.household_id

    // Default to current month if not provided
    let targetMonth = monthStr
    if (!targetMonth) {
        const now = new Date()
        targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    }

    // 3. Create/Get Budget
    const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .upsert(
            {
                household_id: householdId,
                month: targetMonth,
                status: 'active'
            },
            { onConflict: 'household_id, month' }
        )
        .select()
        .single()

    if (budgetError) {
        console.error('Error creating budget:', budgetError)
        return { error: budgetError.message }
    }

    // 4. Seed Budget Lines for Categories
    const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('household_id', householdId)
        .eq('type', 'expense')

    if (categories && categories.length > 0) {
        const linesToInsert = categories.map(cat => ({
            budget_id: budgetData.id,
            category_id: cat.id,
            scope: 'shared',
            member_id: null,
            amount: 0 // Default to 0 as requested ("reset")
        }))

        // Upsert lines to avoid dupes if re-running
        const { error: linesError } = await supabase
            .from('budget_lines')
            .upsert(
                linesToInsert,
                { onConflict: 'budget_id, category_id, scope, member_id' }
            )

        if (linesError) {
            console.error('Error seeding budget lines:', linesError)
            return { error: 'Budget created but failed to seed categories.' }
        }
    }

    revalidatePath('/budget')
    revalidatePath('/budget')
    if (shouldRedirect) {
        redirect(`/budget?month=${targetMonth}`) // Redirect to the newly created month
    }
}

export async function seedDefaultCategories() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) return { error: 'No household' }

    const householdId = member.household_id

    const defaults = [
        { name: 'Vivienda', type: 'expense' },
        { name: 'Alimentación', type: 'expense' },
        { name: 'Transporte', type: 'expense' },
        { name: 'Ocio', type: 'expense' },
        { name: 'Salud', type: 'expense' },
        { name: 'Educación', type: 'expense' },
        { name: 'Ahorro', type: 'expense' },
        { name: 'Salario', type: 'income' },
        { name: 'Inversiones', type: 'income' },
    ]

    // 1. Fetch Existing
    const { data: existing } = await supabase
        .from('categories')
        .select('id, name')
        .eq('household_id', householdId)

    const existingNames = new Set(existing?.map(c => c.name) || [])

    // 2. Cleanup Duplicates (if any)
    const nameCounts: Record<string, string[]> = {}
    existing?.forEach(c => {
        if (!nameCounts[c.name]) nameCounts[c.name] = []
        nameCounts[c.name].push(c.id)
    })

    const idsToDelete: string[] = []
    Object.entries(nameCounts).forEach(([name, ids]) => {
        if (ids.length > 1) {
            // Keep the first one, delete the rest
            idsToDelete.push(...ids.slice(1))
        }
    })

    if (idsToDelete.length > 0) {
        const { error: delError } = await supabase.from('categories').delete().in('id', idsToDelete)
        if (delError) {
            console.error('Delete duplicates error:', delError)
            return { error: `Error borrando duplicados: ${delError.message}` }
        }
    }

    // 3. Insert Missing
    const toInsert = defaults
        .filter(d => !existingNames.has(d.name))
        .map(d => ({
            ...d,
            household_id: householdId
        }))

    if (toInsert.length > 0) {
        const { error } = await supabase.from('categories').insert(toInsert)
        if (error) return { error: error.message }
    }

    // 4. Ensure Budget Lines exist for current budget
    // 4. Ensure Budget Lines exist for current budget
    await createBudget(undefined, false)

    revalidatePath('/budget')
    revalidatePath('/transactions')

    return { success: true, message: `Limpieza: Borrados ${idsToDelete.length}, Creados ${toInsert.length}` }
}

export async function updateCategoryBudget(budgetId: string, categoryId: string, amount: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // RLS should handle permissions check on budget_lines, but good practice to ensure member access
    // For MVP, direct update.

    // Check if line exists? We seeded it, so it should. If not, upsert.
    // We default scope to 'shared' for now as per MVP.
    const { error } = await supabase
        .from('budget_lines')
        .upsert({
            budget_id: budgetId,
            category_id: categoryId,
            scope: 'shared',
            amount: amount,
            member_id: null
        }, { onConflict: 'budget_id, category_id, scope, member_id' })

    if (error) {
        console.error('Update budget error:', error)
        return { error: error.message }
    }

    revalidatePath('/budget')
    revalidatePath('/') // Affects dashboard summary
    return { success: true }
}
