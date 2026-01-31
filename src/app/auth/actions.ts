'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const authSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export async function login(formData: FormData) {
    const supabase = await createClient()

    const next = formData.get('next') as string || '/'
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const validation = authSchema.safeParse({ email, password })
    if (!validation.success) {
        return { error: 'Invalid input' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error('Login error:', error.message)
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect(next)
}


export async function signup(formData: FormData) {
    const supabase = await createClient()

    // Validate data
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const next = formData.get('next') as string || '/onboarding'

    const validation = authSchema.safeParse({ email, password })
    if (!validation.success) {
        return { error: 'Invalid input' }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback${next && next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`,
        }
    })

    if (error) {
        return { error: error.message }
    }

    if (data.session) {
        revalidatePath('/', 'layout')
        redirect(next)
    } else if (data.user) {
        // User created but no session -> Email confirmation required
        return { error: 'Revisa tu email para confirmar la cuenta.' }
    }

    return { error: 'Error desconocido al registrar.' }
}

export async function resetPasswordForEmail(email: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
    })

    if (error) {
        console.error('Reset password error:', error.message)
        return { error: error.message }
    }

    return { success: true, message: 'Si el email existe, recibirás un enlace de recuperación.' }
}

export async function updatePassword(password: string) {
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: "Error al actualizar la contraseña: " + error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}
