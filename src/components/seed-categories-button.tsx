'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { seedDefaultCategories } from '@/app/(dashboard)/budget/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function SeedCategoriesButton() {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleClick() {
        startTransition(async () => {
            const toastId = toast.loading('Inicializando categorías...')

            try {
                const result = await seedDefaultCategories()
                if (result.error) {
                    toast.error(`Error: ${result.error}`, { id: toastId })
                } else {
                    toast.success('Categorías creadas correctamente', { id: toastId })
                    // Force hard reload to ensure UI updates if revalidatePath is flaky
                    setTimeout(() => {
                        window.location.reload()
                    }, 1000)
                }
            } catch (e) {
                toast.error('Error de conexión', { id: toastId })
                console.error(e)
            }
        })
    }

    return (
        <Button onClick={handleClick} disabled={isPending} className="gap-2" variant="secondary">
            <Sparkles className="h-4 w-4" />
            {isPending ? 'Configurando...' : 'Inicializar Categorías'}
        </Button>
    )
}
