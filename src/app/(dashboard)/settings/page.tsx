import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { MembersList } from '@/components/settings/members-list'
import { InvitationsList } from '@/components/settings/invitations-list'

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

    // Get Invitations (if Admin)
    const { data: invitations } = await supabase
        .from('household_invitations')
        .select('*')
        .eq('household_id', householdMember.household_id)
        .order('created_at', { ascending: false })

    // Check if admin to show controls
    const isAdmin = householdMember.role === 'admin'

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>

            <div className="grid gap-6">

                {/* Theme Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Apariencia</CardTitle>
                        <CardDescription>Personaliza la interfaz de la aplicación.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="theme-mode">Tema de la interfaz (Oscuro/Claro)</Label>
                            <ThemeToggle />
                        </div>
                    </CardContent>
                </Card>

                {/* MEMBERS */}
                <Card>
                    <CardHeader>
                        <CardTitle>Miembros del Hogar</CardTitle>
                        <CardDescription>
                            Gestiona quién tiene acceso a este presupuesto compartido.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MembersList
                            members={(await supabase.from('household_members').select('*').eq('household_id', householdMember.household_id).order('joined_at')).data || []}
                            currentUserId={user.id}
                            isAdmin={isAdmin}
                        />
                    </CardContent>
                </Card>

                {/* INVITATIONS */}
                {isAdmin && (
                    <InvitationsList invitations={invitations || []} />
                )}

            </div>
            {/* Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle>Preferencias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-2 rounded-lg transition-colors">
                        <div className="space-y-0.5">
                            <Label>Recurrencias Automáticas</Label>
                            <p className="text-xs text-muted-foreground">Generar gastos fijos el día 1 de cada mes.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}
