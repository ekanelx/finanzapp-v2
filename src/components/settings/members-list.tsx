
"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteHouseholdMember } from "@/app/(dashboard)/settings/actions"

interface Member {
    id: string
    nickname?: string
    user_id?: string
    role: string
}

interface MembersListProps {
    members: Member[]
    currentUserId: string
    isAdmin: boolean
}

export function MembersList({ members, currentUserId, isAdmin }: MembersListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Find my role (if needed for fallback, but isAdmin prop is authoritative)
    // const myMember = members.find(m => m.user_id === currentUserId) 
    // const isCurrentUserAdmin = myMember?.role === 'admin' 
    // We use the prop passed from server

    const handleDelete = async (memberId: string) => {
        setDeletingId(memberId)
        const res = await deleteHouseholdMember(memberId)
        setDeletingId(null)

        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success("Miembro eliminado")
        }
    }

    return (
        <div className="space-y-4">
            {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                            {m.nickname ? m.nickname.substring(0, 2).toUpperCase() : (m.user_id === currentUserId ? 'YO' : 'M')}
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                {m.nickname || (m.user_id === currentUserId ? 'Administrador (Tú)' : 'Miembro')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {m.user_id ? 'Usuario Registrado' : 'Miembro Virtual'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize border ${m.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary text-secondary-foreground border-secondary'}`}>
                            {m.role}
                        </span>

                        {isAdmin && m.role !== 'admin' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción eliminará a <strong>{m.nickname || "este miembro"}</strong> del hogar.
                                            Sus transacciones podrían perderse o quedar huérfanas si no se reasignan.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => handleDelete(m.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            disabled={!!deletingId}
                                        >
                                            {deletingId === m.id ? "Eliminando..." : "Eliminar"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
