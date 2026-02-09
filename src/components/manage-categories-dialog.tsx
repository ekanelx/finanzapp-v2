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
import { Plus, Trash2, Pencil, X, Settings2, ChevronLeft, Check } from "lucide-react"
import { createCategory, updateCategory, deleteCategory } from "@/app/(dashboard)/categories/actions"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import * as Icons from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Curated list of icons for personal finance
const AVAILABLE_ICONS = [
    "Wallet", "Banknote", "CreditCard", "PiggyBank", "DollarSign", "Euro",
    "ShoppingBag", "ShoppingCart", "Basket", "Tag", "Gift",
    "Home", "Building", "UtilityPole", "Lightbulb", "Zap", "Wifi", "Phone",
    "Car", "Bus", "Train", "Plane", "Fuel", "MapPin",
    "Utensils", "Coffee", "Beer", "Pizza",
    "Stethoscope", "Pill", "HeartPulse", "Activity",
    "Dumbbell", "Bike", "Flower2", "Trees",
    "GraduationCap", "Book", "Briefcase", "Laptop",
    "Music", "Tv", "Gamepad2", "Ticket", "Camera",
    "Baby", "PawPrint", "Dog", "Cat",
    "Wrench", "Hammer", "Scissors", "Shield"
]

interface Category {
    id: string
    name: string
    type: 'income' | 'expense'
    description?: string | null
    default_budget?: number | null
    periodicity?: string | null
    icon?: string | null
    sort_order?: number
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
        default_budget: '',
        periodicity: 'monthly',
        icon: ''
    })

    const resetForm = () => {
        setFormData({ name: '', type: 'expense', description: '', default_budget: '', periodicity: 'monthly', icon: '' })
        setEditingId(null)
        setIsCreating(false)
    }

    const startEdit = (cat: Category) => {
        setFormData({
            name: cat.name,
            type: cat.type,
            description: cat.description || '',
            default_budget: cat.default_budget ? String(cat.default_budget) : '',
            periodicity: cat.periodicity || 'monthly',
            icon: cat.icon || ''
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
        const payload = {
            name: formData.name,
            description: formData.description,
            default_budget: formData.type === 'expense' && formData.default_budget ? parseFloat(formData.default_budget) : null,
            periodicity: formData.periodicity,
            icon: formData.icon
        }

        if (editingId) {
            result = await updateCategory(editingId, payload)
        } else {
            result = await createCategory({ ...payload, type: formData.type })
        }
        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success(editingId ? 'Categoría actualizada' : 'Categoría creada')
        resetForm()
        router.refresh()
    }

    const expenseCategories = categories.filter(c => c.type === 'expense')
    const incomeCategories = categories.filter(c => c.type === 'income')

    // Helper to render icon safely
    const renderIcon = (iconName: string, className?: string) => {
        const Icon = (Icons as any)[iconName]
        return Icon ? <Icon className={className} /> : null
    }

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
                        <div className="border p-4 rounded-md space-y-4 bg-muted/20 flex-1 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-2">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={resetForm}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <h4 className="font-semibold text-sm">
                                    {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                                </h4>
                            </div>

                            <div className="grid gap-2">
                                <Label>Nombre</Label>
                                <div className="flex gap-2">
                                    <Popover>
                                        <PopoverTrigger
                                            render={
                                                <Button variant="outline" className="w-12 px-0 shrink-0">
                                                    {formData.icon ? renderIcon(formData.icon, "h-4 w-4") : <Icons.HelpCircle className="h-4 w-4 text-muted-foreground" />}
                                                </Button>
                                            }
                                        />
                                        <PopoverContent className="w-64 p-2" align="start">
                                            <div className="grid grid-cols-6 gap-2">
                                                {AVAILABLE_ICONS.map(iconName => (
                                                    <Button
                                                        key={iconName}
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("h-8 w-8 hover:bg-muted", formData.icon === iconName && "bg-muted border border-primary")}
                                                        onClick={() => setFormData({ ...formData, icon: iconName })}
                                                        title={iconName}
                                                    >
                                                        {renderIcon(iconName, "h-4 w-4")}
                                                    </Button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Gimnasio"
                                    />
                                </div>
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

                            {formData.type === 'expense' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Presupuesto (€)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={formData.default_budget}
                                            onChange={e => setFormData({ ...formData, default_budget: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Periodicidad</Label>
                                        <Select
                                            value={formData.periodicity || 'monthly'}
                                            onValueChange={(v) => v && setFormData({ ...formData, periodicity: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Mensual</SelectItem>
                                                <SelectItem value="bimonthly">Bimestral (2 meses)</SelectItem>
                                                <SelectItem value="quarterly">Trimestral (3 meses)</SelectItem>
                                                <SelectItem value="yearly">Anual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2 text-[11px] text-muted-foreground bg-muted p-2 rounded">
                                        {formData.default_budget && parseFloat(formData.default_budget) > 0 ? (
                                            <>
                                                Equivale a <strong>€
                                                    {(() => {
                                                        const amount = parseFloat(formData.default_budget)
                                                        switch (formData.periodicity) {
                                                            case 'bimonthly': return (amount / 2).toFixed(2)
                                                            case 'quarterly': return (amount / 3).toFixed(2)
                                                            case 'yearly': return (amount / 12).toFixed(2)
                                                            default: return amount.toFixed(2)
                                                        }
                                                    })()}
                                                </strong> al mes.
                                            </>
                                        ) : 'Define un presupuesto base.'}
                                    </div>
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
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                            {cat.icon ? renderIcon(cat.icon, "h-4 w-4") : cat.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium flex items-center gap-2">
                                                                {cat.name}
                                                                {cat.periodicity && cat.periodicity !== 'monthly' && (
                                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300 uppercase">
                                                                        {cat.periodicity === 'yearly' ? 'Anual' : cat.periodicity === 'quarterly' ? '3M' : '2M'}
                                                                    </span>
                                                                )}
                                                            </p>
                                                            {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                                                        </div>
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
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                            {cat.icon ? renderIcon(cat.icon, "h-4 w-4") : cat.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{cat.name}</p>
                                                            {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                                                        </div>
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
