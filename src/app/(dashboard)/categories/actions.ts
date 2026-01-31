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

    // RLS ensures household ownership
    // We can reuse the schema or create a partial one. 
    // Ideally we export a separate update schema or use categorySchema.partial()
    const updateSchema = categorySchema.partial()

    const validation = updateSchema.safeParse(data)
    if (!validation.success) return { error: "Datos inválidos" }

    const { error } = await supabase
        .from('categories')
        .update(validation.data)
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
