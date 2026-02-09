"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface BudgetPeriodControlProps {
    currentMonth: Date
}

function isNextMonthFuture(currentDate: Date) {
    const now = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    // Calculate next month
    const nextDate = new Date(currentYear, currentMonth + 1, 1)

    // Compare with first day of current real month + 1 (i.e., next month start)
    // Actually simpler: if next month start is > now
    // We want to allow selecting "current month".
    // If we are in Feb, and we select Jan. Next is Feb. Feb is <= Now. OK.
    // If we are in Feb, and we select Feb. Next is Mar. Mar > Now. Disable.

    // Reset now to start of month to be safe or just strict comparison
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 1, 1) // Start of Next Month
    // Example: Now = Feb 15. Max = Mar 1.
    // Current Selected = Feb. Next = Mar 1. 
    // If Next >= Max ? Yes. So disable?
    // Wait. If I am in Feb. I want to see Feb. I don't want to see March.
    // So if Next Month Start > Now (or Current Month Start).

    return nextDate > new Date()
}

export function BudgetPeriodControl({ currentMonth }: BudgetPeriodControlProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // "month" or "range"
    const view = searchParams.get("view") || "month"
    // "3", "6", "12"
    const range = searchParams.get("range") || "3"

    // Construct URL helper
    const updateParams = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null) params.delete(key)
            else params.set(key, value)
        })
        router.push(`/budget?${params.toString()}`)
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Tabs
                value={view}
                onValueChange={(v) => updateParams({ view: v })}
                className="w-full sm:w-auto"
            >
                <TabsList>
                    <TabsTrigger value="month">Mes</TabsTrigger>
                    <TabsTrigger value="range">Rango</TabsTrigger>
                </TabsList>
            </Tabs>

            {view === "month" && (
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
                    <button
                        onClick={() => {
                            const prev = new Date(currentMonth)
                            prev.setMonth(prev.getMonth() - 1)
                            updateParams({ month: format(prev, 'yyyy-MM-dd') })
                        }}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        ←
                    </button>
                    <span className="font-medium w-32 text-center capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button
                        onClick={() => {
                            const next = new Date(currentMonth)
                            next.setMonth(next.getMonth() + 1)
                            updateParams({ month: format(next, 'yyyy-MM-dd') })
                        }}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        →
                    </button>
                </div>
            )}

            {view === "range" && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Últimos</span>
                    <Select
                        value={range}
                        onValueChange={(v) => updateParams({ range: v })}
                    >
                        <SelectTrigger className="w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="3">3 meses</SelectItem>
                            <SelectItem value="6">6 meses</SelectItem>
                            <SelectItem value="12">12 meses</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    )
}
