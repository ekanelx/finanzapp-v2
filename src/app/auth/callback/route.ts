import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Logic: If it supports "next", we just redirect to origin + next
            console.log(`Auth Callback Success. Redirecting to ${origin}${next}`)
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Auth Callback Exchange Error:', error)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/login?error=auth_code_error`)
}
