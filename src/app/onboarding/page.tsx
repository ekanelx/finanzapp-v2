
import { createHousehold } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Check if already in a household
    if (user) {
        const { data: member } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (member) {
            redirect('/')
        }
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Configura tu Hogar</CardTitle>
                    <CardDescription>
                        Para empezar, crea un nombre para tu economía doméstica.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={createHousehold} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre del Hogar</Label>
                            <Input id="name" name="name" placeholder="Familia Pérez" required />
                        </div>

                        <Button type="submit" className="w-full">Crear Hogar</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
