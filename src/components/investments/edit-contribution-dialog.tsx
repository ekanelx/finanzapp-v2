"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateContribution } from "@/app/(dashboard)/investments/actions"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface EditContributionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contribution: {
        id: string
        amount: number
        date: string
        member_id: string
    }
    members: {
        household_member_id: string
        name: string
    }[]
}

export function EditContributionDialog({ open, onOpenChange, contribution, members }: EditContributionDialogProps) {
    const [loading, setLoading] = React.useState(false)

    // Initial state from contribution
    const [amount, setAmount] = React.useState(contribution.amount)
    const [date, setDate] = React.useState(contribution.date)
    const [memberId, setMemberId] = React.useState(contribution.member_id)

    // Update state when contribution changes or dialog opens
    React.useEffect(() => {
        if (open) {
            setAmount(contribution.amount)
            setDate(contribution.date)
            setMemberId(contribution.member_id)
        }
    }, [open, contribution])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await updateContribution({
            id: contribution.id,
            amount: Number(amount),
            date,
            memberId
        })

        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success("Aportación actualizada")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Aportación</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles de esta aportación.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-member">Miembro</Label>
                            <Select value={memberId} onValueChange={(v) => v && setMemberId(v)}>
                                <SelectTrigger>
                                    <span>
                                        {members.find(m => m.household_member_id === memberId)?.name || "Seleccionar miembro..."}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.household_member_id} value={m.household_member_id}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-amount">Cantidad (€)</Label>
                            <Input
                                id="edit-amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-date">Fecha</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={date ? new Date(date).toISOString().split('T')[0] : ''}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
