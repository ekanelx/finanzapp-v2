'use server'

import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import { redirect } from 'next/navigation'

export async function acceptInvitation(token: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        const nextUrl = `/invite/accept?token=${token}`
        return { error: 'Not authenticated', redirect: `/auth/login?next=${encodeURIComponent(nextUrl)}` }
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

    // 4. (Feature Flag) 1-Household Rule
    const invitesV2 = process.env.INVITES_V2_ENABLED === 'true'

    if (invitesV2) {
        // Delete memberships where user_id = me AND household_id != new_id
        const { error: cleanupError } = await supabase
            .from('household_members')
            .delete()
            .eq('user_id', user.id)
            .neq('household_id', invitation.household_id)

        if (cleanupError) {
            console.warn('Cleanup other households error:', cleanupError)
        }
    }

    // Mark accepted
    await supabase
        .from('household_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

    return { success: true }
}
