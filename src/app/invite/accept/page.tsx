
import { acceptInvitation } from '@/app/invite/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription>Falta el token de invitación.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/"><Button>Ir al Inicio</Button></Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Attempt to accept immediately (server-side)
    const result = await acceptInvitation(token)

    if (result.redirect) {
        redirect(result.redirect)
    }

    if (result.error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">No se pudo aceptar</CardTitle>
                        <CardDescription>{result.error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/"><Button variant="outline">Ir al Inicio</Button></Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Success
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md border-green-500/50 bg-green-500/10">
                <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-400">¡Bienvenido!</CardTitle>
                    <CardDescription>Te has unido al hogar éxitosamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/"><Button className="w-full">Ir al Dashboard</Button></Link>
                </CardContent>
            </Card>
        </div>
    )
}
