'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const transactionSchema = z.object({
    amount: z.coerce.number().positive(),
    description: z.string().min(1),
    category: z.string().optional(),
    date: z.string().optional(),
    type: z.enum(['income', 'expense']).optional().default('expense'),
    scope: z.enum(['shared', 'member']).optional().default('shared'),
})

export async function createTransaction(formData: FormData) {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 2. Parse Input first
    const rawData = {
        amount: formData.get('amount'),
        description: formData.get('description'),
        category: formData.get('category'),
        date: formData.get('date'),
        scope: formData.get('scope'),
        type: formData.get('type')
    }

    console.log('[CreateTransaction] Payload:', rawData)

    const validation = transactionSchema.safeParse(rawData)

    if (!validation.success) {
        // Flatten errors for easier reading
        const errorDetails = validation.error.flatten().fieldErrors
        console.error('[CreateTransaction] Validation FAILED:', JSON.stringify(errorDetails, null, 2))

        // Construct a readable error message
        const errorMessage = Object.entries(errorDetails)
            .map(([field, issues]) => `${field}: ${issues?.join(', ')}`)
            .join(' | ')

        return { ok: false, error: `Datos inválidos: ${errorMessage}` }
    }

    const { scope } = validation.data

    // 3. Get Household Member Info
    const { data: memberRecord, error: memberError } = await supabase
        .from('household_members')
        .select('id, household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (memberError || !memberRecord) {
        console.error('[CreateTransaction] Member fetch error:', memberError)
        return { ok: false, error: 'No se encontró un hogar para este usuario' }
    }

    const householdMemberId = memberRecord.id
    const activeHouseholdId = memberRecord.household_id

    // 4. Determine member_id
    let transactionMemberId = null
    if (scope === 'member') {
        transactionMemberId = householdMemberId
        console.log(`[CreateTransaction] Scope MEMBER. Using household_members.id: ${transactionMemberId}`)
    } else {
        transactionMemberId = null
        console.log(`[CreateTransaction] Scope SHARED. member_id is null`)
    }

    // 5. Insert
    console.log('[CreateTransaction] Inserting DB Row:', {
        household_id: activeHouseholdId,
        user_id: user.id,
        member_id: transactionMemberId,
        scope,
        amount: validation.data.amount
    })

    const { data, error } = await supabase
        .from('transactions')
        .insert({
            household_id: activeHouseholdId,
            user_id: user.id,
            amount: validation.data.amount,
            description: validation.data.description,
            date: validation.data.date ? new Date(validation.data.date) : new Date(),
            type: validation.data.type,
            scope: scope,
            member_id: transactionMemberId,
            category_id: validation.data.category
        })
        .select()

    if (error) {
        console.error('[CreateTransaction] DB Insert Error:', error)
        return { ok: false, error: `Error DB: ${error.message}` }
    }

    console.log('[CreateTransaction] Success:', data)

    revalidatePath('/') // Dashboard
    revalidatePath('/transactions') // List
    revalidatePath('/budget') // Budget impact

    return { ok: true, data }
}

// Zod schema for update (id required)
const updateTransactionSchema = transactionSchema.extend({
    id: z.string().uuid(),
})

export async function updateTransaction(formData: FormData) {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 2. Parse Input
    const rawData = {
        id: formData.get('id'),
        amount: formData.get('amount'),
        description: formData.get('description'),
        category: formData.get('category'),
        date: formData.get('date'),
        scope: formData.get('scope'),
        type: formData.get('type')
    }

    const validation = updateTransactionSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: 'Datos impálidos (Update)' }
    }

    // 3. Update in DB
    const { data: member } = await supabase
        .from('household_members')
        .select('id, household_id')
        .eq('user_id', user.id)
        .single()

    // Logic for member_id based on new scope
    const { scope } = validation.data
    const finalMemberId = scope === 'member' && member ? member.id : null

    const { error } = await supabase
        .from('transactions')
        .update({
            amount: validation.data.amount,
            description: validation.data.description,
            date: validation.data.date ? new Date(validation.data.date) : new Date(),
            scope: scope,
            type: validation.data.type,
            member_id: finalMemberId,
            category_id: validation.data.category
        })
        .eq('id', validation.data.id)

    if (error) {
        console.error('Update error:', error)
        return { error: error.message }
    }

    revalidatePath('/transactions')
    revalidatePath('/budget')
    revalidatePath('/')

    return { success: true }
}

export async function deleteTransaction(id: string) {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 2. Household Security Check (handled by RLS mostly, but good to verify member)
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single()

    if (!member) return { error: 'No member found' }

    // 3. Delete (RLS will ensure we only delete if we are member)
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('household_id', member.household_id) // Extra safety

    if (error) {
        console.error('[DeleteTransaction] Error:', error)
        return { error: error.message }
    }

    revalidatePath('/')
    revalidatePath('/transactions')
    revalidatePath('/budget')
    return { success: true }
}
