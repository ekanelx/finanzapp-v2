

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, User, Wallet, Pencil, TrendingUp, Percent } from 'lucide-react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { AddContributionDialog } from '@/components/add-contribution-dialog'
import { EditInvestmentDialogClient } from '@/components/investments/edit-investment-dialog-client' // Wrapper
import { fetchCryptoPrice } from '@/app/(dashboard)/investments/actions'
import { ContributionsTable } from "@/components/investments/contributions-table"

export default async function InvestmentDetailPage(props: {
    params: Promise<{ id: string }>
}) {
    const params = await props.params
    const productId = params.id
    const supabase = await createClient()

    // 1. Auth & Household
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: member } = await supabase
        .from('household_members')
        .select('household_id, id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) redirect('/onboarding')

    // 2. Fetch Product
    const { data: product } = await supabase
        .from('investment_products')
        .select('*')
        .eq('id', productId)
        .eq('household_id', member.household_id)
        .single()

    if (!product) notFound()

    // 3. Fetch Contributions
    const { data: contributions } = await supabase
        .from('investment_contributions')
        .select('*')
        .eq('product_id', productId)
        .order('date', { ascending: false })

    // 4. Fetch Members for Name Mapping
    const { data: allMembers } = await supabase
        .from('household_members')
        .select('id, user_id, role')
        .eq('household_id', member.household_id)

    const membersList = allMembers?.map(m => ({
        household_member_id: m.id,
        name: m.user_id === user.id ? 'Yo' : `Miembro ${m.id.substring(0, 4)}`
    })) || []

    const currentMemberId = member.id

    // 5. CALCS & REAL-TIME
    // Calculate total invested (deposits - withdrawals)
    let totalInvested = 0
    let totalYields = 0

    // Sort contributions by date ascending for accurate history if needed, but here simple sum is enough
    contributions?.forEach(c => {
        const amt = Number(c.amount)
        if (c.type === 'withdrawal') {
            totalInvested -= amt
        } else if (c.type === 'yield') {
            totalYields += amt
        } else {
            // Deposit (default)
            totalInvested += amt
        }
    })

    const byMember: Record<string, number> = {}
    contributions?.forEach(c => {
        // Only count deposits/withdrawals for member share
        if (c.type !== 'yield') {
            const amt = Number(c.amount)
            const signedAmt = c.type === 'withdrawal' ? -amt : amt
            byMember[c.member_id] = (byMember[c.member_id] || 0) + signedAmt
        }
    })

    // Real-time price
    let currentPricePerUnit = null
    let totalCurrentValue = null
    let profitability = null
    let profitabilityPercent = null

    if (product.category === 'crypto' && product.symbol) {
        currentPricePerUnit = await fetchCryptoPrice(product.symbol)
    }

    // Determine "Current Value"
    // Option A: API Value (if we had quantity, which we don't really have in schema, we tracked Amount in currency directly)
    // Wait, the schema tracks `amount` in currency (EUR). 
    // If it's Crypto, users usually buy X amount of BTC. 
    // BUT our `contributions` table just has `amount` (numeric). It assumes currency.
    // If we want to track Units, we would need a `units` column.
    // Without `units`, we cannot calculate current value from Price * Units.
    // 
    // WORKAROUND for MVP:
    // User inputs `current_balance` manually in Edit Dialog, OR we just show the Price as reference.
    // OR we assume `current_balance` is the SSOT for value if provided.

    if (product.current_balance !== null) {
        totalCurrentValue = Number(product.current_balance)
    }
    // If no manual balance, we default to "Invested + Yields" (Book Value)
    else {
        totalCurrentValue = totalInvested + totalYields
    }

    // Calculate Profitability
    // Profit = (Current Value - Net Invested)
    if (totalInvested > 0) {
        const profit = totalCurrentValue - totalInvested
        profitability = profit
        profitabilityPercent = (profit / totalInvested) * 100
    }

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div>
                <Link href="/investments" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
                    <ArrowLeft className="mr-1 h-3 w-3" /> Volver a Inversiones
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start justify-between w-full md:w-auto gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight capitalize flex items-center gap-2">
                                {product.name}
                                {product.symbol && <span className="text-lg text-muted-foreground uppercase">({product.symbol})</span>}
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="secondary" className="capitalize">{product.category === 'fi' ? 'Renta Fija' : product.category}</Badge>
                                <Badge variant="outline" className="text-muted-foreground">{product.platform || 'Sin plataforma'}</Badge>
                                <span className="text-sm text-muted-foreground">• Creado el {new Date(product.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <EditInvestmentDialogClient investment={product} />
                    </div>
                    <AddContributionDialog
                        productId={product.id}
                        productName={product.name}
                        members={membersList}
                        currentMemberId={currentMemberId}
                    />
                </div>
            </div>

            {/* REAL-TIME ALERT */}
            {currentPricePerUnit && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-md flex items-center justify-between">
                    <span className="text-sm font-medium">
                        Precio actual de mercado ({product.symbol}):
                    </span>
                    <span className="font-bold">
                        €{currentPricePerUnit.toLocaleString()}
                    </span>
                </div>
            )}

            {/* SUMMARY CARDS */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Actual</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{totalCurrentValue?.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {product.current_balance !== null ? "Saldo manual" : "Estimado (Inversión + Rendimiento)"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Neto Invertido</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{totalInvested.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Aportaciones - Retiradas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rentabilidad</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${Number(profitability) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(profitability) > 0 ? '+' : ''}€{Number(profitability).toLocaleString()}
                        </div>
                        <p className={`text-xs font-medium ${Number(profitabilityPercent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(profitabilityPercent).toFixed(2)}% ROI
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rendimientos (Cash)</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+€{totalYields.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Intereses / Dividendos cobrados
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* BREAKDOWN */}
            <h3 className="text-lg font-semibold mt-6">Desglose por Miembro</h3>
            <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(byMember).map(([mId, amount]) => {
                    const memberName = membersList.find(m => m.household_member_id === mId)?.name || 'Desconocido'
                    return (
                        <Card key={mId}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{memberName}</CardTitle>
                                <User className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">€{amount.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">
                                    {totalInvested > 0 ? ((amount / totalInvested) * 100).toFixed(1) : 0}% del invertido
                                </p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <ContributionsTable contributions={contributions} members={membersList} />
        </div>
    )
}
