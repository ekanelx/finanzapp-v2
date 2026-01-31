
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return NextResponse.json({
        hasSupabaseUrl: !!supabaseUrl,
        supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 8) + '...' : null,
        hasAnonKey: !!supabaseAnonKey,
        anonKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
    })
}
