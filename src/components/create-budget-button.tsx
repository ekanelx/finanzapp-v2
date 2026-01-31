'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createBudget } from '@/app/(dashboard)/budget/actions'
import { toast } from 'sonner'

export function CreateBudgetButton({ month }: { month?: string }) {
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        setLoading(true)
        try {
            const res = await createBudget(month)
            if (res?.error) {
                toast.error(res.error)
            } else {
                toast.success("Presupuesto creado")
            }
        } catch (e) {
            console.error(e)
            toast.error("Error al crear presupuesto")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button onClick={handleCreate} disabled={loading} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {loading ? 'Creando...' : 'Crear Presupuesto'}
        </Button>
    )
}
