'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createHash, randomBytes } from 'crypto'
import { sendInvitationEmail } from '@/lib/email'

export async function deleteHouseholdMember(memberId: string) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    // 1. Get member info
    const { data: targetMember } = await supabase
        .from('household_members')
        .select('*')
        .eq('id', memberId)
        .single()

    if (!targetMember) return { error: "Miembro no encontrado" }
    if (targetMember.role === 'admin') return { error: "No se puede eliminar a un administrador" }

    // 2. Verify admin
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

    if (deleteError) return { error: deleteError.message }

    revalidatePath('/settings')
    return { success: true }
}

export async function createInvitation(email: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Logic: Get User's Household (Admin only)
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user.id)
        .single()

    if (!member || member.role !== 'admin') {
        return { error: 'Solo los administradores pueden invitar.' }
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (normalizedEmail === user.email?.toLowerCase()) {
        return { error: 'No te puedes invitar a ti mismo.' }
    }

    // Check pending invites
    const { data: existing } = await supabase
        .from('household_invitations')
        .select('id')
        .eq('household_id', member.household_id)
        .eq('invited_email', normalizedEmail)
        .is('accepted_at', null)
        .is('revoked_at', null)
        .maybeSingle()

    if (existing) {
        return { error: 'Ya existe una invitación pendiente para este email.' }
    }

    // Generate Token
    const token = randomBytes(32).toString('hex') // 64 chars
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Expires in 7 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // DB Insert
    const { error: insertError } = await supabase
        .from('household_invitations')
        .insert({
            household_id: member.household_id,
            invited_email: normalizedEmail,
            token_hash: tokenHash,
            invited_by: user.id,
            expires_at: expiresAt.toISOString()
        })

    if (insertError) {
        console.error('Invite insert error', insertError)
        return { error: insertError.message }
    }

    // Send Email
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${token}`
    const emailResult = await sendInvitationEmail(normalizedEmail, link)

    revalidatePath('/settings')

    if (emailResult.dev) {
        // In dev mode without email provider, return link to UI for easy testing
        return { success: true, message: `(DEV) Link: ${link}` }
    }
    if (!emailResult.success) {
        return { success: true, message: `Invitación creada, pero falló el email: ${emailResult.error}` }
    }

    return { success: true, message: 'Invitación enviada.' }
}

export async function revokeInvitation(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('household_invitations')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
    // RLS assures we only update if we are admin of that household

    if (error) return { error: error.message }
    revalidatePath('/settings')
    return { success: true }
}
