"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface BudgetMonthSelectProps {
    availableMonths: string[]
    currentMonth: string
    periodMonths: number
}

export function BudgetMonthSelect({ availableMonths, currentMonth, periodMonths }: BudgetMonthSelectProps) {
    const router = useRouter()
    const params = useSearchParams()

    const pushWith = (month: string, period: number) => {
        const sp = new URLSearchParams(params.toString())
        sp.set('month', month)
        sp.set('period', String(period))
        router.push(`/budget?${sp.toString()}`)
    }

    return (
        <div className="flex items-center gap-2">
            <Select value={currentMonth} onValueChange={(val) => val && pushWith(val, periodMonths)}>
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

            <Select value={String(periodMonths)} onValueChange={(val) => pushWith(currentMonth, Number(val))}>
                <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Periodicidad" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="1">Último mes</SelectItem>
                    <SelectItem value="2">Últimos 2 meses</SelectItem>
                    <SelectItem value="3">Últimos 3 meses</SelectItem>
                    <SelectItem value="12">Últimos 12 meses</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
