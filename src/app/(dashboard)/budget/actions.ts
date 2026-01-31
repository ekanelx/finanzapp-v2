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

// Obj B: Robust update with upsert/idempotency
export async function updateCategoryBudget(budgetId: string, categoryId: string, amount: number) {
    const supabase = await createClient()

    // We must ensure budget existence logic if budgetId is weak, 
    // BUT the SetCategoryBudget comp receives a budgetId. 
    // If budgetId is empty (no budget yet for this month), we face a problem. 
    // The previous Page logic passes `budget.id` if budget exists. 
    // If budget is null, the Page doesn't render cards properly or `budgetId` is undefined.
    // However, if we leverage the "Default Budget" logic, user might want to Override only one category. A budget row MUST exist for that month.

    // Let's rely on finding/creating the Budget Header first if missing.
    // Wait, the component currently receives `budgetId` from the page only if budget exists.
    // If budget doesn't exist, we show "Sin Presupuesto". So `budgetId` is supposedly valid if we are rendering the card.
    // Actually, checking `page.tsx`:
    // `{!budget ? ( Alert ... ) : ( ... Cards ... )}`
    // So if we see the card, `budget` object exists, so `budgetId` is valid UUID.

    // Manual Upsert to handle nullable unique constraint issues
    // 1. Check if line exists
    const { data: existingLine } = await supabase
        .from('budget_lines')
        .select('id')
        .eq('budget_id', budgetId)
        .eq('category_id', categoryId)
        .eq('scope', 'shared')
        .is('member_id', null)
        .maybeSingle()

    let error
    if (existingLine) {
        // Update
        const { error: updateError } = await supabase
            .from('budget_lines')
            .update({ amount })
            .eq('id', existingLine.id)
        error = updateError
    } else {
        // Insert
        // Note: we still provide type='expense' etc.
        const { error: insertError } = await supabase
            .from('budget_lines')
            .insert({
                budget_id: budgetId,
                category_id: categoryId,
                amount: amount,
                type: 'expense',
                scope: 'shared',
                member_id: null
            })
        error = insertError
    }

    if (error) {
        console.error("Error saving budget line:", error)
        return { error: error.message }
    }

    revalidatePath('/budget')
    revalidatePath('/') // Affects dashboard summary
    return { success: true }
}
