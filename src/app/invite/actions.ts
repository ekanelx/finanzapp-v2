'use server'

import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import { redirect } from 'next/navigation'

export async function acceptInvitation(token: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated', redirect: `/auth/login?next=/invite/accept?token=${token}` }
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Find Invitation
    // Use security definer function or just query if policy allows (we added "Invitee can view" policy)
    // Actually, querying directly works if we allowed correct policy.
    const { data: invitation, error: fetchError } = await supabase
        .from('household_invitations')
        .select('*')
        .eq('token_hash', tokenHash)
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (fetchError || !invitation) {
        return { error: 'Invitación no válida o expirada.' }
    }

    // Verify Email Match
    if (invitation.invited_email.toLowerCase() !== user.email?.toLowerCase()) {
        return { error: `Esta invitación es para ${invitation.invited_email}, pero estás conectado como ${user.email}.` }
    }

    // Join Household
    // Check if already member?
    const { data: existingMember } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', invitation.household_id)
        .eq('user_id', user.id)
        .maybeSingle()

    if (existingMember) {
        // Already member, just burn the invite
        await supabase
            .from('household_invitations')
            .update({ accepted_at: new Date().toISOString() })
            .eq('id', invitation.id)
        return { success: true, message: 'Ya eras miembro de este hogar.' }
    }

    // Insert Member
    const { error: insertError } = await supabase
        .from('household_members')
        .insert({
            household_id: invitation.household_id,
            user_id: user.id,
            role: 'member'
        })

    if (insertError) {
        console.error('Accept invite insert error', insertError)
        return { error: 'Error al unirte al hogar.' }
    }

    // Mark accepted
    await supabase
        .from('household_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

    return { success: true }
}
