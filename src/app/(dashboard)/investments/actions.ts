'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createInvestmentProduct(data: { name: string; platform: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Get Household
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) return { error: 'No household found' }

    const payload = {
        household_id: member.household_id,
        name: data.name,
        platform: data.platform
    }

    console.log('[createInvestmentProduct] Payload:', payload)

    const { error } = await supabase
        .from('investment_products')
        .insert(payload)

    if (error) {
        console.error('[createInvestmentProduct] Error:', error.message)
        return { error: error.message }
    }

    console.log('[createInvestmentProduct] Success')
    revalidatePath('/investments')
    return { success: true }
}

export async function addContribution(data: { productId: string; memberId: string; amount: number; date: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Get Household (Security check)
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) return { error: 'No household found' }

    const payload = {
        household_id: member.household_id,
        product_id: data.productId,
        member_id: data.memberId,
        date: data.date,
        amount: data.amount
    }

    console.log('[addContribution] Payload:', payload)

    const { error } = await supabase
        .from('investment_contributions')
        .insert(payload)

    if (error) {
        console.error('[addContribution] Error:', error.message)
        return { error: error.message }
    }

    console.log('[addContribution] Success')
    revalidatePath(`/investments/${data.productId}`)
    revalidatePath('/investments')
    return { success: true }
}

export async function updateContribution(data: { id: string; amount: number; date: string; memberId: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Get Household (Security check)
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) return { error: 'No household found' }

    // Verify contribution exists and belongs to household
    const { data: existing, error: fetchError } = await supabase
        .from('investment_contributions')
        .select('id, product_id')
        .eq('id', data.id)
        .eq('household_id', member.household_id)
        .single()

    if (fetchError || !existing) return { error: 'Contribution not found' }

    const payload = {
        member_id: data.memberId,
        date: data.date,
        amount: data.amount
    }

    console.log('[updateContribution] Payload:', payload)

    const { error } = await supabase
        .from('investment_contributions')
        .update(payload)
        .eq('id', data.id)

    if (error) {
        console.error('[updateContribution] Error:', error.message)
        return { error: error.message }
    }

    console.log('[updateContribution] Success')
    revalidatePath(`/investments/${existing.product_id}`)
    revalidatePath('/investments')
    return { success: true }
}

export async function deleteContribution(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Get Household (Security check)
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) return { error: 'No household found' }

    // Verify contribution exists and belongs to household (to get product_id for revalidation)
    const { data: existing, error: fetchError } = await supabase
        .from('investment_contributions')
        .select('id, product_id')
        .eq('id', id)
        .eq('household_id', member.household_id)
        .single()

    if (fetchError || !existing) return { error: 'Contribution not found' }

    const { error } = await supabase
        .from('investment_contributions')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('[deleteContribution] Error:', error.message)
        return { error: error.message }
    }

    console.log('[deleteContribution] Success')
    revalidatePath(`/investments/${existing.product_id}`)
    revalidatePath('/investments')
    return { success: true }
}
