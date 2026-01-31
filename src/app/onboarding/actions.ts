'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const householdSchema = z.object({
    name: z.string().min(2),
})

export async function createHousehold(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth/login')
    }

    const name = formData.get('name') as string

    const validation = householdSchema.safeParse({ name })
    if (!validation.success) {
        // Handle error
        return
    }

    // 1. Create Household
    const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({ name, created_by: user.id })
        .select()
        .single()

    if (householdError) {
        console.error('Error creating household:', householdError)
        // return error
        return
    }

    // Member insertion handled by DB Trigger handle_new_household

    redirect('/')
}
