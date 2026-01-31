"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"


import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { TransactionForm } from "@/components/transaction-form"
import { deleteTransaction } from "@/app/(dashboard)/transactions/actions"

interface TransactionActionsMenuProps {
    transaction: any
    categories: any[]
}



// Rewriting Component to use separate buttons for simplicity and stability first.
// If user really wants dropdown, we can do it, but "Actions" column usually fits 2 icons.

export function TransactionActions({ transaction, categories }: TransactionActionsMenuProps) {
    const [openDelete, setOpenDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        const result = await deleteTransaction(transaction.id)
        setIsDeleting(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success("Transacción eliminada")
        setOpenDelete(false)
    }

    return (
        <div className="flex items-center gap-2">
            {/* Edit */}
            <TransactionForm
                categories={categories}
                existingTransaction={transaction}
                trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                    </Button>
                }
            />

            {/* Delete */}
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setOpenDelete(true)}
                >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                </Button>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Estás seguro?</DialogTitle>
                        <DialogDescription>
                            Esta acción no se puede deshacer. Se eliminará la transacción permanentemente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
