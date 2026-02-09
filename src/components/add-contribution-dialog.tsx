"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { addContribution } from "@/app/(dashboard)/investments/actions"

interface Member {
    household_member_id: string
    name: string
}

interface AddContributionDialogProps {
    productId: string
    productName: string
    members: Member[]
    currentMemberId: string
}

export function AddContributionDialog({ productId, productName, members, currentMemberId }: AddContributionDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [amount, setAmount] = React.useState("")
    const [date, setDate] = React.useState(new Date().toISOString().split('T')[0])
    const [memberId, setMemberId] = React.useState(currentMemberId)
    const [type, setType] = React.useState('deposit')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await addContribution({
            productId,
            memberId,
            amount: parseFloat(amount),
            date,
            type
        })

        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success("Aportación registrada")
        setOpen(false)
        setAmount("")
        setType("deposit")
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
                <Plus className="mr-2 h-4 w-4" /> Nueva Aportación
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nueva Aportación</DialogTitle>
                    <DialogDescription>
                        Añadir dinero a {productName}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Tipo</Label>
                            <Select value={type} onValueChange={(v) => v && setType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="deposit">Aportación</SelectItem>
                                    <SelectItem value="withdrawal">Retirada</SelectItem>
                                    <SelectItem value="yield">Rendimiento / Dividendo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="member">Miembro</Label>
                            <Select value={memberId} onValueChange={(val) => val && setMemberId(val)}>
                                <SelectTrigger>
                                    <span>
                                        {members.find(m => m.household_member_id === memberId)?.name || "Selecciona miembro..."}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map(m => (
                                        <SelectItem key={m.household_member_id} value={m.household_member_id}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Cantidad (€)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date">Fecha</Label>
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Aportación"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
