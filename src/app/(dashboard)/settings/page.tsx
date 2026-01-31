
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { MockMemberButton } from './mock-member-button'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // Get Household Members
    const { data: householdMember } = await supabase
        .from('household_members')
        .select('household_id')
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
                    <div className="space-y-4">
                        {members?.map((m) => (
                            <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0 px-2 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                                        {m.nickname ? m.nickname.substring(0, 2).toUpperCase() : 'YO'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {m.nickname || 'Administrador (Tú)'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {m.user_id ? 'Usuario Registrado' : 'Miembro Virtual'}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full capitalize border border-secondary">{m.role}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        <Button variant="outline" className="w-full" disabled>Invitar Miembro (Prox.)</Button>
                        <MockMemberButton />
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
                            <Label>Modo Oscuro</Label>
                            <p className="text-xs text-muted-foreground">Apariencia de la aplicación (Forzado por sistema).</p>
                        </div>
                        <Switch checked disabled />
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
