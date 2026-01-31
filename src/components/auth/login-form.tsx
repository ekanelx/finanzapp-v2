
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { signup } from "@/app/auth/actions"

export function LoginForm() {
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [envCheck, setEnvCheck] = useState<boolean | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        // Check if client env vars are loaded (simple check)
        const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
        const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        setEnvCheck(hasUrl && hasKey)
    }, [])

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setErrorMsg(null)
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        if (!email || !password) {
            const msg = "Email y contraseña requeridos"
            toast.error(msg)
            setErrorMsg(msg)
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error("Login Error:", error.message)
                toast.error(error.message)
                setErrorMsg(error.message)
            } else {
                router.replace("/")
                router.refresh()
            }
        } catch (err: any) {
            console.error("Unexpected Error:", err)
            const msg = err.message || "Error desconocido"
            toast.error(msg)
            setErrorMsg(msg)
        } finally {
            setLoading(false)
        }
    }

    async function handleSignupClick(e: React.MouseEvent) {
        e.preventDefault()
        const form = e.currentTarget.closest('form')
        if (!form) return

        const formData = new FormData(form)
        setLoading(true)
        const res = await signup(formData)
        setLoading(false)

        if (res?.error) {
            toast.error(res.error)
            setErrorMsg(res.error)
        } else {
            toast.success("Cuenta creada. Redirigiendo...")
        }
    }

    const isProd = process.env.NODE_ENV === 'production'

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-2xl">Bienvenido a Finanzapp</CardTitle>
                <CardDescription>
                    Introduce tu correo para iniciar sesión o registrarte.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <form className="grid gap-4" onSubmit={handleLogin}>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="m@ejemplo.com" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input id="password" name="password" type="password" required />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? "Cargando..." : "Iniciar Sesión"}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            disabled={loading}
                            onClick={handleSignupClick}
                        >
                            Registrarse
                        </Button>
                    </div>
                </form>

                {errorMsg && (
                    <div className="text-sm text-destructive font-medium text-center p-2 bg-destructive/10 rounded">
                        {errorMsg}
                    </div>
                )}

                {isProd && (
                    <div className="text-xs text-muted-foreground text-center border-t pt-2">
                        [Debug] Client Env OK: {envCheck ? "true" : "false"}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 text-center text-xs text-muted-foreground">
                <p>Gestión de finanzas para el hogar.</p>
            </CardFooter>
        </Card>
    )
}
