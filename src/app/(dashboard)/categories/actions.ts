'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { categorySchema } from '@/lib/categories/schema'

function revalidateAll() {
    revalidatePath('/')
    revalidatePath('/budget')
    revalidatePath('/transactions')
    revalidatePath('/settings')
}

export async function createCategory(data: unknown) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single()

    if (!member) return { error: 'Sin hogar' }

    const validation = categorySchema.safeParse(data)
    if (!validation.success) return { error: 'Datos inválidos' }

    const { data: maxSort } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('household_id', member.household_id)
        .eq('type', validation.data.type)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

    const sortOrder = (maxSort?.sort_order ?? 0) + 1

    const { error } = await supabase
        .from('categories')
        .insert({
            ...validation.data,
            household_id: member.household_id,
            sort_order: sortOrder,
            budget_period_months: validation.data.budget_period_months ?? 1,
        })

    if (error) return { error: error.message }

    revalidateAll()
    return { success: true }
}

export async function updateCategory(id: string, data: unknown) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const updateSchema = categorySchema.partial()
    const validation = updateSchema.safeParse(data)
    if (!validation.success) return { error: 'Datos inválidos' }

    const { error } = await supabase
        .from('categories')
        .update(validation.data)
        .eq('id', id)

    if (error) return { error: error.message }

    revalidateAll()
    return { success: true }
}

export async function reorderCategories(orderedIds: string[], type: 'income' | 'expense') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    for (let i = 0; i < orderedIds.length; i += 1) {
        const { error } = await supabase
            .from('categories')
            .update({ sort_order: i + 1 })
            .eq('id', orderedIds[i])
            .eq('type', type)
        if (error) return { error: error.message }
    }

    revalidateAll()
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

    if (error) return { error: error.message }

    revalidateAll()
    return { success: true }
}
