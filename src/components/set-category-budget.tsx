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
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil } from "lucide-react"
import { updateCategoryBudget } from "@/app/(dashboard)/budget/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface SetCategoryBudgetProps {
    budgetId: string
    categoryId: string
    categoryName: string
    currentAmount: number
}

export function SetCategoryBudget({ budgetId, categoryId, categoryName, currentAmount }: SetCategoryBudgetProps) {
    const [open, setOpen] = React.useState(false)
    const [amount, setAmount] = React.useState(currentAmount)
    const [loading, setLoading] = React.useState(false)
    const router = useRouter() // Import needed!

    // Sync if props change (revalidation)
    React.useEffect(() => {
        setAmount(currentAmount)
    }, [currentAmount])

    async function handleSave() {
        setLoading(true)
        const result = await updateCategoryBudget(budgetId, categoryId, Number(amount))
        setLoading(false)

        if (result?.error) {
            toast.error(`Error: ${result.error}`)
        } else {
            toast.success("Presupuesto actualizado")
            setOpen(false)
            router.refresh()
        }
    }

    // Allow trigger as child or default icon
    // For now, let's use a small Edit icon button
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Pencil className="h-3 w-3" />
                        <span className="sr-only">Editar presupuesto</span>
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajustar Presupuesto</DialogTitle>
                    <DialogDescription>
                        Límite mensual para {categoryName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Cantidad
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
