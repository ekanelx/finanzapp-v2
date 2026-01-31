
"use client"

import { useState } from "react"
import { Plus, X, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { createInvitation, revokeInvitation } from "@/app/(dashboard)/settings/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Invitation {
    id: string
    invited_email: string
    created_at: string
    expires_at: string
    accepted_at: string | null
    revoked_at: string | null
}

export function InvitationsList({ invitations }: { invitations: Invitation[] }) {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleInvite() {
        if (!email.includes("@")) return
        setLoading(true)
        const result = await createInvitation(email)
        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
        } else {
            toast.success(result?.message || "Invitación enviada")
            setEmail("")
            router.refresh()
        }
    }

    async function handleRevoke(id: string) {
        const result = await revokeInvitation(id)
        if (result?.error) {
            toast.error(result.error)
        } else {
            toast.success("Invitación revocada")
            router.refresh()
        }
    }

    // Filter active vs past
    const activeInvites = invitations.filter(i => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date())

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invitaciones</CardTitle>
                <CardDescription>Invita a nuevos miembros por email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Invite Form */}
                <div className="flex gap-2">
                    <Input
                        placeholder="email@ejemplo.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={loading}
                    />
                    <Button onClick={handleInvite} disabled={loading || !email}>
                        {loading ? 'Enviando...' : 'Invitar'}
                    </Button>
                </div>

                {/* List */}
                <div className="space-y-2">
                    {activeInvites.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No hay invitaciones pendientes.</p>
                    )}
                    {activeInvites.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">{inv.invited_email}</p>
                                    <p className="text-xs text-muted-foreground">Expira: {new Date(inv.expires_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleRevoke(inv.id)} className="text-destructive hover:text-destructive">
                                Revocar
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
