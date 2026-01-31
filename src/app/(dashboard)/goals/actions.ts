'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- GOAL MANAGEMENT ---

export async function createGoal(data: { name: string; target_amount: number; deadline?: string }) {
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

    const { error } = await supabase
        .from('goals')
        .insert({
            household_id: member.household_id,
            name: data.name,
            target_amount: data.target_amount,
            deadline: data.deadline || null,
            current_amount: 0
        })

    if (error) return { error: error.message }
    revalidatePath('/goals')
    return { success: true }
}

export async function updateGoal(goalId: string, data: { name: string; target_amount: number; deadline?: string }) {
    const supabase = await createClient()
    // Auth check implied by RLS but good to have user check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('goals')
        .update({
            name: data.name,
            target_amount: data.target_amount,
            deadline: data.deadline || null
        })
        .eq('id', goalId)

    if (error) return { error: error.message }
    revalidatePath('/goals')
    return { success: true }
}

export async function deleteGoal(goalId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('goals').delete().eq('id', goalId)
    if (error) return { error: error.message }
    revalidatePath('/goals')
    return { success: true }
}

// --- CONTRIBUTIONS & WITHDRAWALS ---

export async function addGoalTransaction(
    goalId: string,
    amount: number,
    memberId: string,
    date: string,
    comment?: string
) {
    const supabase = await createClient()

    // Create contribution entry
    // Trigger `on_goal_contribution_change` will update the goal's `current_amount` automatically
    const { error } = await supabase
        .from('goal_contributions')
        .insert({
            goal_id: goalId,
            member_id: memberId, // Using member_id as requested
            amount: amount, // Can be negative for withdrawals
            date: date,
            comment: comment
        })

    if (error) return { error: error.message }
    revalidatePath('/goals')
    return { success: true }
}
