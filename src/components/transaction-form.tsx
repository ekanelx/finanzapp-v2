"use client"

import * as React from "react"
import { CalendarIcon, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { createTransaction, updateTransaction } from "@/app/(dashboard)/transactions/actions"
import { SCOPE_OPTIONS, TRANSACTION_TYPES_FORM } from "@/lib/transaction-options"

// Define props
interface Category {
    id: string
    name: string
}

interface TransactionFormProps {
    categories?: Category[]
    existingTransaction?: any // Optional: if provided, we are in Edit Mode
    trigger?: React.ReactNode // Optional trigger to replace default button
}

export function TransactionForm({ categories = [], existingTransaction, trigger }: TransactionFormProps) {
    const [date, setDate] = React.useState<Date | undefined>(
        existingTransaction ? new Date(existingTransaction.date) : new Date()
    )
    const [open, setOpen] = React.useState(false)

    // Controlled state for selects to ensure correct label rendering
    const [type, setType] = React.useState<string>(existingTransaction?.type || "expense")
    const [category, setCategory] = React.useState<string>(existingTransaction?.category_id || "")
    const [scope, setScope] = React.useState<string>(existingTransaction?.scope || "shared")

    // Update state when existingTransaction changes (if modal re-opens with different data)
    React.useEffect(() => {
        if (open) {
            setType(existingTransaction?.type || "expense")
            setCategory(existingTransaction?.category_id || "")
            setScope(existingTransaction?.scope || "shared")
            setDate(existingTransaction ? new Date(existingTransaction.date) : new Date())
        }
    }, [open, existingTransaction])

    async function clientAction(formData: FormData) {
        let result
        if (existingTransaction) {
            formData.append('id', existingTransaction.id)
            result = await updateTransaction(formData)
        } else {
            result = await createTransaction(formData)
        }

        if (result?.error) {
            alert(`Error: ${result.error}`)
            return
        }
        setOpen(false)
    }

    return (
        <>
            {trigger ? (
                <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
                    {trigger}
                </div>
            ) : (
                <Button className="gap-2 text-primary-foreground font-semibold" onClick={() => setOpen(true)}>
                    <Plus className="h-4 w-4" /> Añadir Movimiento
                </Button>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="p-6 sm:p-8">
                    <SheetHeader>
                        <SheetTitle>{existingTransaction ? 'Editar Transacción' : 'Añadir Transacción'}</SheetTitle>
                        <SheetDescription>
                            {existingTransaction ? 'Modifica los detalles.' : 'Registra un ingreso o gasto manualmente.'}
                        </SheetDescription>
                    </SheetHeader>
                    <form action={clientAction} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Cantidad</Label>
                            <Input
                                id="amount"
                                name="amount"
                                type="number"
                                step="0.01"
                                className="col-span-3"
                                required
                                defaultValue={existingTransaction?.amount}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Concepto</Label>
                            <Input
                                id="description"
                                name="description"
                                className="col-span-3"
                                required
                                defaultValue={existingTransaction?.description}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Tipo</Label>
                            <Select name="type" value={type} onValueChange={(v) => v && setType(v)}>
                                <SelectTrigger className="col-span-3">
                                    <span>{TRANSACTION_TYPES_FORM.find(t => t.value === type)?.label || "Selecciona Tipo..."}</span>
                                </SelectTrigger>
                                <SelectContent>
                                    {TRANSACTION_TYPES_FORM.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Categoría</Label>
                            <Select name="category" value={category} onValueChange={(v) => v && setCategory(v)}>
                                <SelectTrigger className="col-span-3">
                                    <span>
                                        {categories.find(c => c.id === category)?.name || "Selecciona Categoría..."}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    {categories && categories.length > 0 ? (
                                        categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="uncategorized" disabled>Sin categorías disponibles</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="scope" className="text-right">Visibilidad</Label>
                            <Select name="scope" value={scope} onValueChange={(v) => v && setScope(v)}>
                                <SelectTrigger className="col-span-3">
                                    <span>{SCOPE_OPTIONS.find(s => s.value === scope)?.label || "Selecciona Alcance..."}</span>
                                </SelectTrigger>
                                <SelectContent>
                                    {SCOPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Fecha</Label>
                            <Popover>
                                <PopoverTrigger
                                    className={cn(
                                        buttonVariants({ variant: "outline" }),
                                        "col-span-3 justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: es }) : <span>Hoy</span>}
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <input type="hidden" name="date" value={date ? date.toISOString() : new Date().toISOString()} />
                        </div>
                        <SheetFooter>
                            <Button type="submit">{existingTransaction ? 'Actualizar' : 'Guardar'}</Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>
        </>
    )
}
