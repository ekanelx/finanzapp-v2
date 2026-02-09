"use client"

import * as React from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditContributionDialog } from "./edit-contribution-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteContribution } from "@/app/(dashboard)/investments/actions"
import { toast } from "sonner"

interface ContributionsTableProps {
    contributions: any[] | null
    members: {
        household_member_id: string
        name: string
    }[]
}

export function ContributionsTable({ contributions, members }: ContributionsTableProps) {
    const [editingContribution, setEditingContribution] = React.useState<any>(null)
    const [deletingId, setDeletingId] = React.useState<string | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const handleDelete = async () => {
        if (!deletingId) return
        setIsDeleting(true)
        const result = await deleteContribution(deletingId)
        setIsDeleting(false)
        setDeletingId(null)

        if (result?.error) {
            toast.error(result.error)
            return
        }
        toast.success("Aportación eliminada")
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Aportaciones</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Miembro</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contributions?.map((c) => {
                            const mName = members.find(m => m.household_member_id === c.member_id)?.name || '...'
                            const isYield = c.type === 'yield'
                            const isWithdrawal = c.type === 'withdrawal'
                            const isDeposit = !c.type || c.type === 'deposit'

                            return (
                                <TableRow key={c.id} className="group">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            {new Date(c.date).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {isYield && <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Rendimiento</span>}
                                        {isWithdrawal && <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Retirada</span>}
                                        {isDeposit && <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Aportación</span>}
                                    </TableCell>
                                    <TableCell>{mName}</TableCell>
                                    <TableCell className={`text-right font-bold ${isWithdrawal ? 'text-red-600' : 'text-green-600'}`}>
                                        {isWithdrawal ? '-' : '+'}€{Number(c.amount).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={() => setEditingContribution(c)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => setDeletingId(c.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {(!contributions || contributions.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                    No hay movimientos todavía.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            {/* EDIT DIALOG */}
            {editingContribution && (
                <EditContributionDialog
                    open={!!editingContribution}
                    onOpenChange={(open) => !open && setEditingContribution(null)}
                    contribution={editingContribution}
                    members={members}
                />
            )}

            {/* DELETE ALERT */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar aportación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente este registro de aportación. El total invertido se recalculará.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
