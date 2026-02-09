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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function CreateInvestmentDialog() {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [name, setName] = React.useState("")
    const [platform, setPlatform] = React.useState("")
    const [category, setCategory] = React.useState("other")
    const [symbol, setSymbol] = React.useState("")
    const [fixedRate, setFixedRate] = React.useState("")
    const [currentBalance, setCurrentBalance] = React.useState("")

    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await createInvestmentProduct({
            name,
            platform,
            category,
            symbol: symbol || undefined,
            fixed_rate: fixedRate ? Number(fixedRate) : undefined,
            current_balance: currentBalance ? Number(currentBalance) : undefined
        })

        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            return
        }

        toast.success("Inversión creada correctamente")
        setOpen(false)
        setName("")
        setPlatform("")
        setCategory("other")
        setSymbol("")
        setFixedRate("")
        setCurrentBalance("")
        router.refresh()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={cn(buttonVariants(), "gap-2")}>
                <Plus className="h-4 w-4" /> Nueva Inversión
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nueva Inversión</DialogTitle>
                    <DialogDescription>
                        Añade un nuevo producto de inversión a tu cartera.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category">Categoría</Label>
                            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="crypto">Criptomoneda</SelectItem>
                                    <SelectItem value="stock">Acciones / ETF</SelectItem>
                                    <SelectItem value="fi">Renta Fija / Depósito</SelectItem>
                                    <SelectItem value="real_estate">Inmobiliario</SelectItem>
                                    <SelectItem value="other">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ej: Bitcoin, S&P 500"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="platform">Plataforma / Banco</Label>
                            <Input
                                id="platform"
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                                placeholder="ej: Binance, MyInvestor"
                            />
                        </div>

                        {(category === 'crypto' || category === 'stock') && (
                            <div className="grid gap-2">
                                <Label htmlFor="symbol">Símbolo (API)</Label>
                                <Input
                                    id="symbol"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                    placeholder={category === 'crypto' ? "ej: bitcoin (id de coingecko)" : "ej: AAPL"}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {category === 'crypto'
                                        ? "Usa el ID de CoinGecko (ej: 'bitcoin' para BTC, 'ethereum' para ETH)"
                                        : "Símbolo para seguimiento de precio (opcional)"}
                                </p>
                            </div>
                        )}

                        {category === 'fi' && (
                            <div className="grid gap-2">
                                <Label htmlFor="fixedRate">Rentabilidad Fija (%)</Label>
                                <Input
                                    id="fixedRate"
                                    type="number"
                                    step="0.01"
                                    value={fixedRate}
                                    onChange={(e) => setFixedRate(e.target.value)}
                                    placeholder="ej: 3.5"
                                />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="currentBalance">Saldo Actual (Opcional)</Label>
                            <Input
                                id="currentBalance"
                                type="number"
                                step="0.01"
                                value={currentBalance}
                                onChange={(e) => setCurrentBalance(e.target.value)}
                                placeholder="Si ya tienes saldo, indícalo aquí"
                            />
                            <p className="text-xs text-muted-foreground">
                                Se usará como valor inicial si no añades aportaciones históricas.
                            </p>
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
