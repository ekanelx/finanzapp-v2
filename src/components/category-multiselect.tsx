"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface CategoryMultiselectProps {
    categories: { id: string; name: string }[]
    selected: string[]
    onChange: (selected: string[]) => void
}

export function CategoryMultiselect({ categories, selected, onChange }: CategoryMultiselectProps) {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter((item) => item !== id))
        } else {
            onChange([...selected, id])
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between h-10")}>
                <span className="truncate">
                    {selected.length === 0
                        ? "Seleccionar..."
                        : selected.length === 1
                            ? categories.find(c => c.id === selected[0])?.name
                            : `${selected.length} seleccionadas`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2 grid gap-1 max-h-[300px] overflow-y-auto">
                    {categories.map((category) => {
                        const isSelected = selected.includes(category.id)
                        return (
                            <div
                                key={category.id}
                                className={cn(
                                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground",
                                    isSelected ? "bg-accent text-accent-foreground" : ""
                                )}
                                onClick={() => handleSelect(category.id)}
                            >
                                <div className={cn("flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                    <Check className={cn("h-3 w-3")} />
                                </div>
                                <span>{category.name}</span>
                            </div>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}
