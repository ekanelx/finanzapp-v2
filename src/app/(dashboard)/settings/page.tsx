import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { MembersList } from '@/components/settings/members-list'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // Get Household Members
    const { data: householdMember } = await supabase
        .from('household_members')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    let members: any[] = []
    if (householdMember) {
        const { data } = await supabase
            .from('household_members')
            .select('*')
            .eq('household_id', householdMember.household_id)
            .order('joined_at')
        members = data || []
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
                <p className="text-muted-foreground">Configuración de tu hogar y aplicación.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Miembros del Hogar</CardTitle>
                    <CardDescription>Gestiona quién tiene acceso a este presupuesto.</CardDescription>
                </CardHeader>
                <CardContent>
                    <MembersList members={members} currentUserId={user.id} />

                    <div className="mt-6">
                        <Button variant="outline" className="w-full" disabled>Invitar Miembro (Prox.)</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Preferencias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-2 rounded-lg transition-colors">
                        <div className="space-y-0.5">
                            <Label>Tema</Label>
                            <p className="text-xs text-muted-foreground">Selecciona el modo visual.</p>
                        </div>
                        <ThemeToggle />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg transition-colors">
                        <div className="space-y-0.5">
                            <Label>Recurrencias Automáticas</Label>
                            <p className="text-xs text-muted-foreground">Generar gastos fijos el día 1 de cada mes.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
