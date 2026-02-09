'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createInvestmentProduct(data: {
    name: string;
    platform: string;
    category: string;
    symbol?: string;
    fixed_rate?: number;
    current_balance?: number;
}) {
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
        platform: data.platform,
        category: data.category,
        symbol: data.symbol || null,
        fixed_rate: data.fixed_rate || null,
        current_balance: data.current_balance || null
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

export async function updateInvestmentProduct(data: {
    id: string;
    name: string;
    platform: string;
    category: string;
    symbol?: string;
    fixed_rate?: number;
    current_balance?: number;
}) {
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
        name: data.name,
        platform: data.platform,
        category: data.category,
        symbol: data.symbol || null,
        fixed_rate: data.fixed_rate || null,
        current_balance: data.current_balance || null
    }

    console.log('[updateInvestmentProduct] Payload:', payload)

    const { error } = await supabase
        .from('investment_products')
        .update(payload)
        .eq('id', data.id)
        .eq('household_id', member.household_id)

    if (error) {
        console.error('[updateInvestmentProduct] Error:', error.message)
        return { error: error.message }
    }

    console.log('[updateInvestmentProduct] Success')
    revalidatePath('/investments')
    revalidatePath(`/investments/${data.id}`)
    return { success: true }
}

export async function deleteInvestmentProduct(id: string) {
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

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
        .from('investment_products')
        .select('id')
        .eq('id', id)
        .eq('household_id', member.household_id)
        .single()

    if (fetchError || !existing) return { error: 'Investment not found' }

    const { error } = await supabase
        .from('investment_products')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('[deleteInvestmentProduct] Error:', error.message)
        return { error: error.message }
    }

    console.log('[deleteInvestmentProduct] Success')
    revalidatePath('/investments')
    return { success: true }
}

export async function addContribution(data: { productId: string; memberId: string; amount: number; date: string; type: string }) {
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
        amount: data.amount,
        type: data.type
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

export async function updateContribution(data: { id: string; amount: number; date: string; memberId: string; type: string }) {
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
        amount: data.amount,
        type: data.type
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

export async function fetchCryptoPrice(symbol: string) {
    try {
        if (!symbol) return null;

        // Coingecko API (Simple Price)
        // Docs: https://www.coingecko.com/en/api/documentation
        // GET /simple/price?ids=bitcoin&vs_currencies=eur

        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=eur`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
            },
            next: { revalidate: 60 * 15 } // Cache for 15 minutes
        });

        if (!response.ok) {
            console.error('[fetchCryptoPrice] API Error:', response.statusText);
            return null;
        }

        const data = await response.json();
        // data structure: { "bitcoin": { "eur": 45000 } }

        const price = data[symbol.toLowerCase()]?.eur;
        return price || null;
    } catch (error) {
        console.error('[fetchCryptoPrice] Exception:', error);
        return null;
    }
}
