"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Filter, X } from "lucide-react"
import { CategoryMultiselect } from "@/components/category-multiselect"
import { Label } from "@/components/ui/label"
import { SORT_OPTIONS, TRANSACTION_TYPES } from "@/lib/transaction-options"

interface TransactionsToolbarProps {
    categories: { id: string; name: string }[]
    members: { id: string; user_id: string; users: { email: string } }[]
}

export function TransactionsToolbar({ categories, members }: TransactionsToolbarProps) {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = useRouter()

    // Helper to update URL params
    const handleSearch = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams)
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        replace(`${pathname}?${params.toString()}`)
    }

    // Parse current selected categories from URL
    const selectedCategories = searchParams.get("category")
        ? searchParams.get("category")!.split(",")
        : []

    const handleCategoryChange = (ids: string[]) => {
        handleSearch("category", ids.length > 0 ? ids.join(",") : null)
    }

    return (
        <div className="flex flex-col gap-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm mb-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filtros Avanzados
                </h3>
                {(searchParams.toString().length > 0) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 lg:px-3 text-muted-foreground"
                        onClick={() => replace(pathname)}
                    >
                        Limpiar <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Type Filter */}
                {/* Type Filter */}
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Filtrar por Tipo</Label>
                    <Select
                        value={searchParams.get("type") || "all"}
                        onValueChange={(val) => handleSearch("type", val === "all" ? null : val)}
                    >
                        <SelectTrigger>
                            {/* Manual label rendering */}
                            <span>
                                {TRANSACTION_TYPES.find(opt => opt.value === (searchParams.get("type") || "all"))?.label || "Tipo"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {TRANSACTION_TYPES.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Category Filter - Multiselect */}
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Por Categoría</Label>
                    <CategoryMultiselect
                        categories={categories}
                        selected={selectedCategories}
                        onChange={handleCategoryChange}
                    />
                </div>

                {/* Sort By */}
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Ordenar por</Label>
                    <Select
                        value={searchParams.get("sort") || "date_desc"}
                        onValueChange={(val) => handleSearch("sort", val)}
                    >
                        <SelectTrigger>
                            {/* Manual label rendering */}
                            <span>
                                {SORT_OPTIONS.find(opt => opt.value === (searchParams.get("sort") || "date_desc"))?.label || "Ordenar por"}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {SORT_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Member Filter (Optional based on members avail) */}
                {members && members.length > 0 ? (
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Por Usuario</Label>
                        <Select
                            value={searchParams.get("member") || "all"}
                            onValueChange={(val) => handleSearch("member", val === "all" ? null : val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Usuario" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {members.map((m) => (
                                    <SelectItem key={m.id} value={m.user_id}>
                                        {(m.users as any)?.email || 'Usuario'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
