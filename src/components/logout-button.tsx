
"use client"

import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function LogoutButton() {
    const router = useRouter()
    const supabase = createClient()

    async function handleLogout() {
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error("Error al cerrar sesión")
        } else {
            router.refresh()
            router.push('/auth/login')
        }
    }

    return (
        <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleLogout}
        >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
        </Button>
    )
}
