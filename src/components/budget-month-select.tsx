"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface BudgetMonthSelectProps {
    availableMonths: string[] // 'YYYY-MM-DD'
    currentMonth: string
}

export function BudgetMonthSelect({ availableMonths, currentMonth }: BudgetMonthSelectProps) {
    const router = useRouter()

    const handleValueChange = (val: string) => {
        router.push(`/budget?month=${val}`)
    }

    // Ensure current month is in the list (if it's a new month not yet in DB, we handle it visually or push it)
    // But usually availableMonths comes from DB. 
    // We'll trust the parent passes strictly used months.

    return (
        <Select value={currentMonth} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
                {availableMonths.map((m) => (
                    <SelectItem key={m} value={m}>
                        {format(new Date(m), "MMMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
