
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DiagnosticsPage() {
    const [testResult, setTestResult] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Read env vars
    // NOTE: NEXT_PUBLIC_ vars are available at build time and usually runtime in Next.js
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    async function handleTest() {
        setLoading(true)
        try {
            const supabase = createClient()
            const { data, error } = await supabase.auth.getSession()
            if (error) {
                setTestResult(`ERROR: ${error.message}`)
            } else {
                setTestResult(`OK: Session retrieved (User: ${data.session?.user?.email || 'None'})`)
            }
        } catch (err: any) {
            setTestResult(`EXCEPTION: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const publicUrlPrefix = supabaseUrl ? supabaseUrl.substring(0, 20) + "..." : "undefined"
    const anonKeyPrefix = supabaseAnonKey
        ? `${supabaseAnonKey.substring(0, 8)}... (len: ${supabaseAnonKey.length})`
        : "undefined"

    return (
        <div className="container mx-auto p-8 font-mono text-sm space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Client Diagnostics</CardTitle>
                    <CardDescription>Variables de entorno en el Cliente y conectividad Supabase Auth</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 border p-4 rounded bg-muted/50">
                        <div className="font-bold">hasPublicUrl</div>
                        <div>{supabaseUrl ? "true" : "false"}</div>

                        <div className="font-bold">hasAnonKey</div>
                        <div>{supabaseAnonKey ? "true" : "false"}</div>

                        <div className="font-bold">publicUrlPrefix</div>
                        <div className="break-all text-xs">{publicUrlPrefix}</div>

                        <div className="font-bold">anonKeyPrefix</div>
                        <div className="break-all text-xs">{anonKeyPrefix}</div>

                        <div className="font-bold">Node Env</div>
                        <div>{process.env.NODE_ENV}</div>
                    </div>

                    <div className="border-t pt-4">
                        <Button onClick={handleTest} disabled={loading}>
                            {loading ? "Testing..." : "Test Supabase Client"}
                        </Button>
                    </div>

                    {testResult && (
                        <div className={`p-4 rounded border ${testResult.startsWith("OK") ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}>
                            <strong>Result:</strong> {testResult}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
