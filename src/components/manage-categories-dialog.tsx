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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Pencil, Save, X, Settings2 } from "lucide-react"
import { createCategory, updateCategory, deleteCategory } from "@/app/(dashboard)/categories/actions"
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
    default_budget?: number | null // Added
}

interface ManageCategoriesDialogProps {
    categories: Category[]
}

export function ManageCategoriesDialog({ categories }: ManageCategoriesDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [isCreating, setIsCreating] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()

    // Form states
    const [formData, setFormData] = React.useState({
        name: '',
        type: 'expense' as 'income' | 'expense',
        description: '',
        default_budget: '' // Added for input control
    })

    const resetForm = () => {
        setFormData({ name: '', type: 'expense', description: '', default_budget: '' })
        setEditingId(null)
        setIsCreating(false)
    }

    const startEdit = (cat: Category) => {
        setFormData({
            name: cat.name,
            type: cat.type,
            description: cat.description || '',
            default_budget: cat.default_budget ? String(cat.default_budget) : ''
        })
        setEditingId(cat.id)
        setIsCreating(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta categoría?')) return
        setLoading(true)
        await deleteCategory(id)
        setLoading(false)
    }

    const handleSave = async () => {
        setLoading(true)
        let result
        if (editingId) {
            result = await updateCategory(editingId, {
                name: formData.name,
                description: formData.description,
                default_budget: formData.type === 'expense' && formData.default_budget ? parseFloat(formData.default_budget) : null
            })
        } else {
            result = await createCategory({
                name: formData.name,
                type: formData.type,
                description: formData.description,
                default_budget: formData.type === 'expense' && formData.default_budget ? parseFloat(formData.default_budget) : null
            })
        }
        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success(editingId ? 'Categoría actualizada' : 'Categoría creada')
        resetForm()
        // Force reload to update list behind modal
        router.refresh()
    }

    const expenseCategories = categories.filter(c => c.type === 'expense')
    const incomeCategories = categories.filter(c => c.type === 'income')

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button variant="outline" size="sm" className="gap-2">
                        <Settings2 className="h-4 w-4" />
                        Gestionar Categorías
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Gestionar Categorías</DialogTitle>
                    <DialogDescription>
                        Crea, edita o elimina las categorías de tus finanzas.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {/* Form Area */}
                    {(isCreating || editingId) && (
                        <div className="border p-4 rounded-md space-y-4 bg-muted/40">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm">
                                    {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                                </h4>
                                <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
                            </div>
                            <div className="grid gap-2">
                                <Label>Nombre</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Gimnasio"
                                />
                            </div>
                            {!editingId && (
                                <div className="grid gap-2">
                                    <Label>Tipo</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(v) => v && setFormData({ ...formData, type: v as 'income' | 'expense' })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="expense">Gasto</SelectItem>
                                            <SelectItem value="income">Ingreso</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label>Descripción (Opcional)</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Pequeña nota..."
                                    className="h-20"
                                />
                            </div>

                            {/* NEW: Default Budget for UX improvement */}
                            {formData.type === 'expense' && (
                                <div className="grid gap-2">
                                    <Label>Presupuesto por Defecto (€/mes)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.default_budget}
                                        onChange={e => setFormData({ ...formData, default_budget: e.target.value })}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Valor base mensual si no se especifica otro.</p>
                                </div>
                            )}

                            <Button className="w-full" onClick={handleSave} disabled={loading || !formData.name}>
                                {loading ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    )}

                    {/* List Area */}
                    {!isCreating && !editingId && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="flex justify-end mb-2">
                                <Button size="sm" onClick={() => setIsCreating(true)} className="gap-2">
                                    <Plus className="h-4 w-4" /> Nueva
                                </Button>
                            </div>

                            <Tabs defaultValue="expense" className="flex-1 flex flex-col overflow-hidden">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="expense">Gastos</TabsTrigger>
                                    <TabsTrigger value="income">Ingresos</TabsTrigger>
                                </TabsList>
                                <ScrollArea className="flex-1 mt-2 border rounded-md">
                                    <TabsContent value="expense" className="m-0">
                                        <div className="p-2 space-y-2">
                                            {expenseCategories.map(cat => (
                                                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div>
                                                        <p className="font-medium">{cat.name}</p>
                                                        {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/70 hover:text-foreground" onClick={() => startEdit(cat)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(cat.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="income" className="m-0">
                                        <div className="p-2 space-y-2">
                                            {incomeCategories.map(cat => (
                                                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div>
                                                        <p className="font-medium">{cat.name}</p>
                                                        {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/70 hover:text-foreground" onClick={() => startEdit(cat)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(cat.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </ScrollArea>
                            </Tabs>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog >
    )
}
