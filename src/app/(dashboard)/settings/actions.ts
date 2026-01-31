'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createVirtualMember(name: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Get current household
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) return { error: 'No household found' }

    const { error } = await supabase
        .from('household_members')
        .insert({
            household_id: member.household_id,
            role: 'member',
            nickname: name,
            user_id: null // Explicitly null
        })

    if (error) {
        console.error('Create virtual member error:', error)
        return { error: error.message }
    }

    revalidatePath('/settings')
    return { success: true }
}
