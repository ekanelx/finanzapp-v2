"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { createInvestmentProduct } from "@/app/(dashboard)/investments/actions"

export function CreateInvestmentDialog() {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [name, setName] = React.useState("")
    const [platform, setPlatform] = React.useState("")
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await createInvestmentProduct({ name, platform })

        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success("Inversión creada correctamente")
        setOpen(false)
        setName("")
        setPlatform("")
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={cn(buttonVariants(), "gap-2")}>
                <Plus className="h-4 w-4" /> Nueva Inversión
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nueva Inversión</DialogTitle>
                    <DialogDescription>
                        Añade un nuevo producto de inversión a tu cartera (ej: Bitcoin, Fondo Indexado, Piso...)
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ej: S&P 500"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="platform">Plataforma / Banco</Label>
                            <Input
                                id="platform"
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                                placeholder="ej: MyInvestor"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creando..." : "Crear Inversión"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
