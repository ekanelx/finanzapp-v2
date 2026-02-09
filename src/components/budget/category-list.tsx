"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { updateCategoryOrder } from "@/app/(dashboard)/categories/actions"
import { toast } from "sonner"
import { GripVertical } from "lucide-react"
import * as Icons from "lucide-react"

interface BudgetCategoryListProps {
    categories: any[]
    view: 'month' | 'range'
    range: number
    budgetId: string | null
    monthlyStats: Record<string, {
        budget: number
        spent: number
        remaining: number
        percent: number
    }>
    rangeStats: Record<string, {
        totalSpent: number
        avgSpent: number
        projectedBudget: number
        deviation: number
        percent: number
    }>
}

export function BudgetCategoryList({
    categories,
    view,
    range,
    budgetId,
    monthlyStats,
    rangeStats,
}: BudgetCategoryListProps) {
    const [orderedCategories, setOrderedCategories] = React.useState(categories)
    const [draggedItem, setDraggedItem] = React.useState<any | null>(null)

    React.useEffect(() => {
        setOrderedCategories(categories)
    }, [categories])

    const handleDragStart = (e: React.DragEvent, item: any) => {
        setDraggedItem(item)
        e.dataTransfer.effectAllowed = 'move'
        // Create invisible drag image or style it
        const el = e.currentTarget as HTMLElement
        el.style.opacity = '0.5'
    }

    const handleDragEnd = (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).style.opacity = '1'
        setDraggedItem(null)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault() // Necessary for drop
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = async (e: React.DragEvent, targetItem: any) => {
        e.preventDefault()
        if (!draggedItem || draggedItem.id === targetItem.id) return

        const currentIndex = orderedCategories.findIndex(c => c.id === draggedItem.id)
        const targetIndex = orderedCategories.findIndex(c => c.id === targetItem.id)

        const newList = [...orderedCategories]
        newList.splice(currentIndex, 1)
        newList.splice(targetIndex, 0, draggedItem)

        setOrderedCategories(newList)

        // Persist order
        // We map the new list to specific sort_order values (e.g. index * 10)
        const updates = newList.map((cat, index) => ({
            id: cat.id,
            sort_order: index * 10
        }))

        // Optimistic UI updated, now sync
        const result = await updateCategoryOrder(updates)
        if (result?.error) {
            toast.error("Error al guardar el orden")
            // Revert on error? For now simple toast.
        }
    }

    // Helper to render icon safely
    const renderIcon = (iconName: string, className?: string) => {
        const Icon = (Icons as any)[iconName] || Icons.HelpCircle
        return <Icon className={className || "h-5 w-5"} />
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orderedCategories.map((cat) => {
                // Stats Logic
                const isMonthly = view === 'month'
                const stats = isMonthly ? monthlyStats[cat.id] : rangeStats[cat.id]
                if (!stats) return null

                const spent = isMonthly ? (stats as any).spent : (stats as any).totalSpent
                const budget = isMonthly ? (stats as any).budget : (stats as any).projectedBudget
                const percent = stats.percent
                const remaining = isMonthly ? (stats as any).remaining : (stats as any).deviation

                const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)
                const isZeroBudget = budget === 0

                // Progress Color
                let progressColor = 'bg-primary'
                if (percent > 100) progressColor = 'bg-rose-500'
                else if (percent > 85) progressColor = 'bg-amber-500'
                else progressColor = 'bg-emerald-500'
                if (isZeroBudget && spent > 0) progressColor = 'bg-rose-500'

                // Periodicity Render Logic
                const getPeriodicityLabel = (p: string) => {
                    switch (p) {
                        case 'yearly': return 'Anual'
                        case 'quarterly': return 'Trimestral'
                        case 'bimonthly': return 'Bimestral'
                        default: return null
                    }
                }
                const pLabel = cat.periodicity ? getPeriodicityLabel(cat.periodicity) : null

                return (
                    <Card
                        key={cat.id}
                        className="hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing relative group"
                        draggable
                        onDragStart={(e) => handleDragStart(e, cat)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, cat)}
                    >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                        </div>

                        <div className="flex flex-row items-center justify-between pb-2 p-6">
                            <div className="space-y-1 overflow-hidden">
                                {cat.icon && (
                                    <div className="mb-2 text-primary">
                                        {renderIcon(cat.icon, "h-6 w-6")}
                                    </div>
                                )}
                                <CardTitle className="text-base font-medium truncate flex items-center gap-2">
                                    {!cat.icon && cat.name}
                                    {cat.icon && <span>{cat.name}</span>}
                                </CardTitle>
                                {cat.description && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={cat.description}>
                                        {cat.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-1 pl-2">
                                {pLabel && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                        {pLabel}
                                    </span>
                                )}
                                {budget > 0 && (
                                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                                        percent > 100 ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground")}>
                                        {Math.round(percent)}%
                                    </span>
                                )}
                            </div>
                        </div>

                        <CardContent className="pt-0">
                            <div className="text-2xl font-bold tabular-nums">
                                {formatCurrency(spent)}
                                <span className="text-muted-foreground text-sm font-normal"> / {formatCurrency(budget)}</span>
                            </div>

                            {budget > 0 ? (
                                <Progress
                                    value={Math.min(percent, 100)}
                                    className="mt-4 h-2"
                                    indicatorClassName={progressColor}
                                />
                            ) : (
                                <div className="mt-4 h-2 w-full bg-muted rounded-full relative overflow-hidden">
                                    <div className="absolute inset-0 bg-muted repeating-linear-gradient-45"></div>
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-3">
                                <p className="text-xs text-muted-foreground">
                                    {view === 'range' ? 'Promedio: ' + formatCurrency((stats as any).avgSpent) :
                                        isZeroBudget && spent > 0 ? 'Sin presupuesto' :
                                            budget > 0 ? 'Disponible' : 'Sin asignar'}
                                </p>
                                <p className={cn("text-xs font-medium", remaining < 0 ? "text-rose-500" : "text-emerald-500")}>
                                    {budget > 0 && (
                                        <>
                                            {remaining >= 0 ? '+' : ''}{formatCurrency(remaining)}
                                        </>
                                    )}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
