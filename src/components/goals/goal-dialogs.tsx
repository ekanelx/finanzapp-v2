"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createGoal, updateGoal, addGoalTransaction } from "@/app/(dashboard)/goals/actions"
import { toast } from "sonner"
import { Plus, Pencil, Wallet, ArrowDown, ArrowUp } from "lucide-react"

// --- TYPES ---
type Goal = {
    id: string
    name: string
    target_amount: number
    current_amount: number
    deadline?: string
}

type Member = {
    id: string
    nickname?: string
    user_id?: string
}

// --- MANAGE GOAL DIALOG (Create/Edit) ---
export function ManageGoalDialog({
    goal,
    trigger
}: {
    goal?: Goal
    trigger?: React.ReactNode
}) {
    const [open, setOpen] = React.useState(false)
    const [name, setName] = React.useState(goal?.name || "")
    const [target, setTarget] = React.useState(goal?.target_amount?.toString() || "")
    const [deadline, setDeadline] = React.useState(goal?.deadline || "")
    const [loading, setLoading] = React.useState(false)

    const isEdit = !!goal

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const payload = {
            name,
            target_amount: parseFloat(target),
            deadline: deadline || undefined
        }

        let res
        if (isEdit && goal) {
            res = await updateGoal(goal.id, payload)
        } else {
            res = await createGoal(payload)
        }

        setLoading(false)

        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success(isEdit ? "Meta actualizada" : "Meta creada")
            setOpen(false)
            if (!isEdit) {
                // Reset form
                setName("")
                setTarget("")
                setDeadline("")
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={(trigger as React.ReactElement) || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Meta
                    </Button>
                )}
            />
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Meta" : "Nueva Meta"}</DialogTitle>
                    <DialogDescription>Define tu objetivo de ahorro.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Viaje a Japón" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="target">Objetivo (€)</Label>
                        <Input id="target" type="number" required min="1" step="0.01" value={target} onChange={e => setTarget(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="deadline">Fecha Objetivo (Opcional)</Label>
                        <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// --- TRANSACTION DIALOG (Deposit/Withdraw) ---
export function GoalTransactionDialog({
    goalId,
    goalName,
    members,
    type = 'deposit',
    trigger
}: {
    goalId: string
    goalName: string
    members: Member[]
    type?: 'deposit' | 'withdraw'
    trigger?: React.ReactNode
}) {
    const [open, setOpen] = React.useState(false)
    const [amount, setAmount] = React.useState("")
    const [memberId, setMemberId] = React.useState("")
    const [date, setDate] = React.useState(new Date().toISOString().split('T')[0])
    const [comment, setComment] = React.useState("")
    const [loading, setLoading] = React.useState(false)

    const isDeposit = type === 'deposit'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!memberId) {
            toast.error("Selecciona un miembro")
            return
        }
        setLoading(true)

        // If withdraw, make amount negative
        const finalAmount = isDeposit ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount))

        const res = await addGoalTransaction(goalId, finalAmount, memberId, date, comment)

        setLoading(false)

        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success(isDeposit ? "Aportación añadida" : "Retirada registrada")
            setOpen(false)
            setAmount("")
            setComment("")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={(trigger as React.ReactElement) || (
                    <Button variant={isDeposit ? "default" : "destructive"} size="sm">
                        {isDeposit ? <Plus className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </Button>
                )}
            />
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isDeposit ? "Aportar Dinero" : "Retirar Dinero"}</DialogTitle>
                    <DialogDescription>
                        {isDeposit ? `Añadir ahorros a: ${goalName}` : `Sacar dinero de: ${goalName}`}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Cantidad (€)</Label>
                        <Input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Miembro</Label>
                        <Select value={memberId} onValueChange={(val) => val && setMemberId(val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="¿Quién hace la operación?" />
                            </SelectTrigger>
                            <SelectContent>
                                {members.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.nickname || (m.user_id ? 'Yo' : `Miembro ${m.id.slice(0, 4)}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Comentario / Motivo</Label>
                        <Input
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder={isDeposit ? "Ahorro mensual..." : "Emergencia..."}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} variant={isDeposit ? "default" : "destructive"}>
                            {loading ? "Procesando..." : (isDeposit ? "Aportar" : "Retirar")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// --- HISTORY DIALOG ---
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export function GoalHistoryDialog({
    goalName,
    contributions,
    members,
    trigger
}: {
    goalName: string
    contributions: any[]
    members: Member[]
    trigger?: React.ReactNode
}) {
    return (
        <Dialog>
            <DialogTrigger
                render={(trigger as React.ReactElement) || (
                    <Button variant="outline" size="sm">Ver Historial</Button>
                )}
            />
            <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Historial de {goalName}</DialogTitle>
                    <DialogDescription>Todos los movimientos y comentarios.</DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Miembro</TableHead>
                                <TableHead>Comentario</TableHead>
                                <TableHead className="text-right">Importe</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contributions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(c => {
                                const m = members.find(mem => mem.id === c.member_id)
                                const isNegative = c.amount < 0
                                return (
                                    <TableRow key={c.id || Math.random()}>
                                        <TableCell className="text-xs whitespace-nowrap">
                                            {new Date(c.date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {m?.nickname || (m?.user_id ? 'Yo' : `Miembro ${c.member_id.slice(0, 4)}`)}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground w-[40%]">
                                            {c.comment || '-'}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold text-xs ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                                            {isNegative ? '' : '+'}{Number(c.amount).toLocaleString()}€
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {contributions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        Sin movimientos
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}
