'use client'

import { useState } from 'react'
import { resetPasswordForEmail } from '@/app/auth/actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        const res = await resetPasswordForEmail(email)

        setLoading(false)
        if (res?.error) {
            toast.error(res.error)
        } else {
            setMessage(res?.message || 'Email enviado.')
            toast.success('Email enviado')
        }
    }

    return (
        <div className="flex h-screen w-full items-center justify-center px-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
                    <CardDescription>
                        Ingresa tu email para recibir un enlace de recuperación.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@ejemplo.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        {message && (
                            <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md border border-green-200">
                                {message}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Enlace
                        </Button>
                        <Link href="/auth/login" className={buttonVariants({ variant: 'link', className: 'w-full' })}>
                            Volver al Login
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
