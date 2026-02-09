"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Pencil, X, Settings2, GripVertical } from "lucide-react"
import { createCategory, updateCategory, deleteCategory, reorderCategories } from "@/app/(dashboard)/categories/actions"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Category {
    id: string
    name: string
    type: 'income' | 'expense'
    description?: string | null
    default_budget?: number | null
    budget_period_months?: 1 | 2 | 3 | 12
    sort_order?: number | null
}

interface ManageCategoriesDialogProps {
    categories: Category[]
}

export function ManageCategoriesDialog({ categories }: ManageCategoriesDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [isCreating, setIsCreating] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [draggingId, setDraggingId] = React.useState<string | null>(null)
    const router = useRouter()

    const [expenseOrder, setExpenseOrder] = React.useState<string[]>([])
    const [incomeOrder, setIncomeOrder] = React.useState<string[]>([])

    const [formData, setFormData] = React.useState({
        name: '',
        type: 'expense' as 'income' | 'expense',
        description: '',
        default_budget: '',
        budget_period_months: '1',
    })

    React.useEffect(() => {
        setExpenseOrder(
            categories
                .filter(c => c.type === 'expense')
                .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.name.localeCompare(b.name))
                .map(c => c.id)
        )
        setIncomeOrder(
            categories
                .filter(c => c.type === 'income')
                .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.name.localeCompare(b.name))
                .map(c => c.id)
        )
    }, [categories])

    const resetForm = () => {
        setFormData({ name: '', type: 'expense', description: '', default_budget: '', budget_period_months: '1' })
        setEditingId(null)
        setIsCreating(false)
    }

    const startEdit = (cat: Category) => {
        setFormData({
            name: cat.name,
            type: cat.type,
            description: cat.description || '',
            default_budget: cat.default_budget ? String(cat.default_budget) : '',
            budget_period_months: String(cat.budget_period_months ?? 1),
        })
        setEditingId(cat.id)
        setIsCreating(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta categoría?')) return
        setLoading(true)
        const result = await deleteCategory(id)
        setLoading(false)
        if (result?.error) toast.error(result.error)
        else {
            toast.success('Categoría eliminada')
            router.refresh()
        }
    }

    const handleSave = async () => {
        setLoading(true)
        let result
        const payload = {
            name: formData.name,
            type: formData.type,
            description: formData.description,
            default_budget: formData.type === 'expense' && formData.default_budget ? parseFloat(formData.default_budget) : null,
            budget_period_months: formData.type === 'expense' ? Number(formData.budget_period_months) as 1 | 2 | 3 | 12 : 1,
        }

        if (editingId) {
            result = await updateCategory(editingId, payload)
        } else {
            result = await createCategory(payload)
        }
        setLoading(false)

        if (result?.error) return toast.error(result.error)

        toast.success(editingId ? 'Categoría actualizada' : 'Categoría creada')
        resetForm()
        router.refresh()
    }

    const categoryMap = new Map(categories.map(c => [c.id, c]))
    const expenseCategories = expenseOrder.map(id => categoryMap.get(id)).filter(Boolean) as Category[]
    const incomeCategories = incomeOrder.map(id => categoryMap.get(id)).filter(Boolean) as Category[]

    const reorderLocal = (list: string[], fromId: string, toId: string) => {
        const fromIdx = list.indexOf(fromId)
        const toIdx = list.indexOf(toId)
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return list
        const copy = [...list]
        const [item] = copy.splice(fromIdx, 1)
        copy.splice(toIdx, 0, item)
        return copy
    }

    const persistOrder = async (type: 'expense' | 'income', list: string[]) => {
        const res = await reorderCategories(list, type)
        if (res?.error) toast.error(res.error)
    }

    const renderRow = (cat: Category, type: 'expense' | 'income') => (
        <div
            key={cat.id}
            draggable
            onDragStart={() => setDraggingId(cat.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
                if (!draggingId || draggingId === cat.id) return
                if (type === 'expense') {
                    const updated = reorderLocal(expenseOrder, draggingId, cat.id)
                    setExpenseOrder(updated)
                    persistOrder('expense', updated)
                } else {
                    const updated = reorderLocal(incomeOrder, draggingId, cat.id)
                    setIncomeOrder(updated)
                    persistOrder('income', updated)
                }
                setDraggingId(null)
            }}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
            <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div>
                    <p className="font-medium">{cat.name}</p>
                    {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                </div>
            </div>
            <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2"><Settings2 className="h-4 w-4" />Gestionar Categorías</Button>} />
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Gestionar Categorías</DialogTitle>
                    <DialogDescription>Crea, edita, ordena (drag & drop) o elimina categorías.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {(isCreating || editingId) && (
                        <div className="border p-4 rounded-md space-y-4 bg-muted/40">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">{editingId ? 'Editar Categoría' : 'Nueva Categoría'}</h4>
                                <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
                            </div>
                            <div className="grid gap-2">
                                <Label>Nombre</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            {!editingId && (
                                <div className="grid gap-2">
                                    <Label>Tipo</Label>
                                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as 'income' | 'expense' })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="expense">Gasto</SelectItem>
                                            <SelectItem value="income">Ingreso</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label>Descripción</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
                            </div>
                            {formData.type === 'expense' && (
                                <>
                                    <div className="grid gap-2">
                                        <Label>Presupuesto por Defecto (€/periodo)</Label>
                                        <Input type="number" value={formData.default_budget} onChange={e => setFormData({ ...formData, default_budget: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Periodicidad</Label>
                                        <Select value={formData.budget_period_months} onValueChange={(v) => setFormData({ ...formData, budget_period_months: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Mensual</SelectItem>
                                                <SelectItem value="2">Cada 2 meses</SelectItem>
                                                <SelectItem value="3">Cada 3 meses</SelectItem>
                                                <SelectItem value="12">Anual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                            <Button className="w-full" onClick={handleSave} disabled={loading || !formData.name}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                        </div>
                    )}

                    {!isCreating && !editingId && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="flex justify-end mb-2">
                                <Button size="sm" onClick={() => setIsCreating(true)} className="gap-2"><Plus className="h-4 w-4" /> Nueva</Button>
                            </div>
                            <Tabs defaultValue="expense" className="flex-1 flex flex-col overflow-hidden">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="expense">Gastos</TabsTrigger>
                                    <TabsTrigger value="income">Ingresos</TabsTrigger>
                                </TabsList>
                                <ScrollArea className="flex-1 mt-2 border rounded-md">
                                    <TabsContent value="expense" className="m-0"><div className="p-2 space-y-2">{expenseCategories.map(c => renderRow(c, 'expense'))}</div></TabsContent>
                                    <TabsContent value="income" className="m-0"><div className="p-2 space-y-2">{incomeCategories.map(c => renderRow(c, 'income'))}</div></TabsContent>
                                </ScrollArea>
                            </Tabs>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
