'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCategory(data: { name: string; type: 'income' | 'expense'; description?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) return { error: 'No household found' }

    const { error } = await supabase
        .from('categories')
        .insert({
            household_id: member.household_id,
            name: data.name,
            type: data.type,
            description: data.description
        })

    if (error) {
        console.error('Create category error:', error)
        return { error: error.message }
    }

    revalidatePath('/')
    revalidatePath('/budget')
    revalidatePath('/transactions')
    return { success: true }
}

export async function updateCategory(id: string, data: { name: string; description?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // RLS ensures household ownership
    const { error } = await supabase
        .from('categories')
        .update({
            name: data.name,
            description: data.description
        })
        .eq('id', id)

    if (error) {
        console.error('Update category error:', error)
        return { error: error.message }
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

    // Check for dependencies? 
    // Foreign keys usually restrict delete if transactions exist unless ON DELETE CASCADE.
    // Our schema has ON DELETE SET NULL for transactions -> category_id
    // And ON DELETE CASCADE for budget_lines -> category_id
    // So deletion should be safe but might leave orphans in UI if not handled.
    // Let's proceed with deletion.

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
