"use client"

import * as React from "react"
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { EditInvestmentDialog } from "@/components/investments/edit-investment-dialog"

interface EditInvestmentDialogClientProps {
    investment: {
        id: string
        name: string
        platform: string | null
        category: string
        symbol: string | null
        fixed_rate: number | null
        current_balance: number | null
    }
}

export function EditInvestmentDialogClient({ investment }: EditInvestmentDialogClientProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <>
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
                <Pencil className="h-4 w-4" />
            </Button>
            <EditInvestmentDialog
                open={open}
                onOpenChange={setOpen}
                investment={investment}
            />
        </>
    )
}
