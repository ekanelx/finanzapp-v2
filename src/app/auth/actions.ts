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

    // Validate data
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
    redirect('/')
}


export async function signup(formData: FormData) {
    const supabase = await createClient()

    // Validate data
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const validation = authSchema.safeParse({ email, password })
    if (!validation.success) {
        return { error: 'Invalid input' }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/onboarding')
}
