
// @ts-ignore - Valid server actions
import { login, signup } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Bienvenido a Finanzapp</CardTitle>
                    <CardDescription>
                        Introduce tu correo para iniciar sesión o registrarte.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <form className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="m@ejemplo.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>

                        {/* @ts-expect-error: Server action return type mismatch with formAction */}
                        <Button formAction={login} className="w-full">Iniciar Sesión</Button>
                        {/* @ts-expect-error: Server action return type mismatch with formAction */}
                        <Button formAction={signup} variant="outline" className="w-full">Registrarse</Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 text-center text-xs text-muted-foreground">
                    <p>Gestión de finanzas para el hogar.</p>
                </CardFooter>
            </Card>
        </div>
    )
}
