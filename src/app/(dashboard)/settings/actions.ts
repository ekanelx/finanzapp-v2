
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteHouseholdMember(memberId: string) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: "No autenticado" }
    }

    // 1. Get current user's role in the household
    // We need to know which household we are talking about.
    // We can assume we want to delete a member from the *same* household the user is in.

    // First, find the household_id of the target member to be safe, 
    // OR find my household_id and ensure target is in it.

    // Let's get the target member first to know the household and role
    const { data: targetMember, error: fetchError } = await supabase
        .from('household_members')
        .select('*')
        .eq('id', memberId)
        .single()

    if (fetchError || !targetMember) {
        return { error: "Miembro no encontrado" }
    }

    if (targetMember.role === 'admin') {
        return { error: "No se puede eliminar a un administrador" }
    }

    // 2. Verify I am an admin of THAT household
    const { data: myMembership } = await supabase
        .from('household_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('household_id', targetMember.household_id)
        .single()

    if (!myMembership || myMembership.role !== 'admin') {
        return { error: "No tienes permisos de administrador" }
    }

    // 3. Delete
    const { error: deleteError } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId)

    if (deleteError) {
        return { error: deleteError.message }
    }

    revalidatePath('/settings')
    return { success: true }
}
