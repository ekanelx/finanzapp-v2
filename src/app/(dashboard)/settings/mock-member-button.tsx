"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { createVirtualMember } from "./actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"

export function MockMemberButton() {
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()

    const handleCreate = async () => {
        setLoading(true)
        // Auto-generate name "Miembro Test X" or just "Pareja Test"
        const result = await createVirtualMember("Pareja (Test)")
        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success("Miembro de prueba creado")
        router.refresh()
    }

    return (
        <Button variant="outline" onClick={handleCreate} disabled={loading} className="w-full mt-2">
            <UserPlus className="mr-2 h-4 w-4" />
            {loading ? "Creando..." : "Crear Miembro de Prueba (+1)"}
        </Button>
    )
}
