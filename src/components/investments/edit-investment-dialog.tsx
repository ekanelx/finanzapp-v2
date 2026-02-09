"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { updateInvestmentProduct, deleteInvestmentProduct } from "@/app/(dashboard)/investments/actions"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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

interface EditInvestmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    investment: {
        id: string
        name: string
        platform: string | null
        category: string
        symbol: string | null
        fixed_rate: number | null
        current_balance: number | null
    }
}

export function EditInvestmentDialog({ open, onOpenChange, investment }: EditInvestmentDialogProps) {
    const [loading, setLoading] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [showDeleteAlert, setShowDeleteAlert] = React.useState(false)

    // Form state
    const [name, setName] = React.useState(investment.name)
    const [platform, setPlatform] = React.useState(investment.platform || "")
    const [category, setCategory] = React.useState(investment.category || "other")
    const [symbol, setSymbol] = React.useState(investment.symbol || "")
    const [fixedRate, setFixedRate] = React.useState(investment.fixed_rate?.toString() || "")
    const [currentBalance, setCurrentBalance] = React.useState(investment.current_balance?.toString() || "")

    const router = useRouter()

    React.useEffect(() => {
        if (open) {
            setName(investment.name)
            setPlatform(investment.platform || "")
            setCategory(investment.category || "other")
            setSymbol(investment.symbol || "")
            setFixedRate(investment.fixed_rate?.toString() || "")
            setCurrentBalance(investment.current_balance?.toString() || "")
        }
    }, [open, investment])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await updateInvestmentProduct({
            id: investment.id,
            name,
            platform,
            category,
            symbol: symbol || undefined,
            fixed_rate: fixedRate ? Number(fixedRate) : undefined,
            current_balance: currentBalance ? Number(currentBalance) : undefined
        })

        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success("Inversión actualizada")
        onOpenChange(false)
        router.refresh()
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        const result = await deleteInvestmentProduct(investment.id)
        setIsDeleting(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success("Inversión eliminada")
        setShowDeleteAlert(false)
        onOpenChange(false)
        router.push('/investments') // Redirect to list
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Inversión</DialogTitle>
                        <DialogDescription>
                            Modifica los datos de tu inversión o elimínala.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-category">Categoría</Label>
                                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="crypto">Criptomoneda</SelectItem>
                                        <SelectItem value="stock">Acciones / ETF</SelectItem>
                                        <SelectItem value="fi">Renta Fija / Depósito</SelectItem>
                                        <SelectItem value="real_estate">Inmobiliario</SelectItem>
                                        <SelectItem value="other">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Nombre</Label>
                                <Input
                                    id="edit-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="ej: S&P 500"
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-platform">Plataforma / Banco</Label>
                                <Input
                                    id="edit-platform"
                                    value={platform}
                                    onChange={(e) => setPlatform(e.target.value)}
                                    placeholder="ej: MyInvestor"
                                />
                            </div>

                            {(category === 'crypto' || category === 'stock') && (
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-symbol">Símbolo (API)</Label>
                                    <Input
                                        id="edit-symbol"
                                        value={symbol}
                                        onChange={(e) => setSymbol(e.target.value)}
                                        placeholder={category === 'crypto' ? "ej: bitcoin" : "ej: AAPL"}
                                    />
                                </div>
                            )}

                            {category === 'fi' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-fixedRate">Rentabilidad Fija (%)</Label>
                                    <Input
                                        id="edit-fixedRate"
                                        type="number"
                                        step="0.01"
                                        value={fixedRate}
                                        onChange={(e) => setFixedRate(e.target.value)}
                                        placeholder="ej: 3.5"
                                    />
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="edit-currentBalance">Saldo Actual (Manual/Inicial)</Label>
                                <Input
                                    id="edit-currentBalance"
                                    type="number"
                                    step="0.01"
                                    value={currentBalance}
                                    onChange={(e) => setCurrentBalance(e.target.value)}
                                    placeholder="Saldo actual"
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => setShowDeleteAlert(true)}
                                className="mr-auto"
                            >
                                Eliminar
                            </Button>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente la inversión <strong>{name}</strong> y todo su historial de aportaciones. No se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? "Eliminando..." : "Eliminar Inversión"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
