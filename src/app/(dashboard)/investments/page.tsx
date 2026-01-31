
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { TrendingUp, Wallet, ArrowRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreateInvestmentDialog } from '@/components/create-investment-dialog'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function InvestmentsPage() {
    const supabase = await createClient()

    // 1. Get User & Household
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) redirect('/onboarding')

    const activeHouseholdId = member.household_id

    // 1b. Get Members (for mapping names)
    const { data: allMembers } = await supabase
        .from('household_members')
        .select('id, user_id, nickname')
        .eq('household_id', activeHouseholdId)

    const membersMap: Record<string, string> = {}
    allMembers?.forEach(m => {
        membersMap[m.id] = m.nickname || (m.user_id === user.id ? 'Yo' : `Miembro ${m.id?.substring(0, 4)}`)
    })

    // 2. Fetch Products
    const { data: products } = await supabase
        .from('investment_products')
        .select('*')
        .eq('household_id', activeHouseholdId)
        .order('created_at', { ascending: false })

    // 3. Fetch Contributions Totals (Aggregated by Product)
    // We can't do complex GROUP BY easily with Supabase JS client type-safe without RPC usually, 
    // but for MVP we can fetch all contributions and aggregate in JS (assuming list isn't huge yet)
    // Or we can fetch sums if we had a view. Let's do JS aggregation for now, simpler.
    const { data: contributions } = await supabase
        .from('investment_contributions')
        .select('product_id, amount, member_id')
        .eq('household_id', activeHouseholdId)

    const totalsByProduct: Record<string, number> = {}
    const memberTotalsByProduct: Record<string, Record<string, number>> = {}
    const globalMemberTotals: Record<string, number> = {}
    let grandTotal = 0

    contributions?.forEach(c => {
        const amt = Number(c.amount)
        totalsByProduct[c.product_id] = (totalsByProduct[c.product_id] || 0) + amt

        // Per Product
        if (!memberTotalsByProduct[c.product_id]) memberTotalsByProduct[c.product_id] = {}
        memberTotalsByProduct[c.product_id][c.member_id] = (memberTotalsByProduct[c.product_id][c.member_id] || 0) + amt

        // Global
        globalMemberTotals[c.member_id] = (globalMemberTotals[c.member_id] || 0) + amt

        grandTotal += amt
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inversiones</h1>
                    <p className="text-muted-foreground">Patrimonio y ahorro a largo plazo.</p>
                </div>
                <CreateInvestmentDialog />
            </div>

            {/* SUMMARY CARD */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Patrimonio Total</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold mb-1 tabular-nums">€{grandTotal.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground mb-4">
                            En {products?.length || 0} productos activos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Balance Global por Miembro</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(globalMemberTotals).sort(([, a], [, b]) => b - a).map(([mId, amt]) => {
                                const mName = membersMap[mId] || '?'
                                const max = Math.max(...Object.values(globalMemberTotals))
                                const diff = max - amt
                                const isLeader = diff === 0 && max > 0

                                return (
                                    <div key={mId} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isLeader ? 'bg-emerald-500' : 'bg-muted'}`} />
                                            <span className="font-medium">{mName}</span>
                                            {isLeader && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 rounded">Líder</span>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold tabular-nums">€{amt.toLocaleString()}</span>
                                            {diff > 0 && <span className="text-xs text-rose-500 bg-rose-500/10 px-1 rounded tabular-nums">-{diff.toLocaleString()}</span>}
                                        </div>
                                    </div>
                                )
                            })}
                            {Object.keys(globalMemberTotals).length === 0 && <p className="text-sm text-muted-foreground">Sin datos aun</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PRODUCTS GRID */}
            {(!products || products.length === 0) ? (
                <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl bg-muted/30 mt-8">
                    <Wallet className="h-10 w-10 text-muted-foreground/20 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Comienza a Invertir</h3>
                    <p className="text-muted-foreground mb-6 text-center max-w-sm">
                        Añade tu primer fondo de inversión, acciones, criptomonedas o cualquier activo.
                    </p>
                    <CreateInvestmentDialog />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
                    {products.map((prod) => {
                        const total = totalsByProduct[prod.id] || 0
                        const memberBreakdown = memberTotalsByProduct[prod.id] || {}
                        return (
                            <Link href={`/investments/${prod.id}`} key={prod.id} className="block group">
                                <Card className="h-full hover:border-primary/50 transition-all cursor-pointer">
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                                                {prod.name}
                                            </CardTitle>
                                            {prod.platform && (
                                                <p className="text-xs text-muted-foreground">{prod.platform}</p>
                                            )}
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="mt-4">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Capital Aportado</p>
                                            <div className="text-2xl font-bold mb-4 tabular-nums">
                                                €{total.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </div>

                                            {/* Member Breakdown */}
                                            <div className="space-y-1 pt-3 border-t">
                                                {Object.entries(memberBreakdown).map(([mId, amt]) => {
                                                    const mName = membersMap[mId] || '?'
                                                    const max = Math.max(...Object.values(memberBreakdown))
                                                    const diff = max - amt
                                                    const isLeader = diff === 0 && max > 0

                                                    return (
                                                        <div key={mId} className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-medium text-muted-foreground">{mName}</span>
                                                                {isLeader && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1 rounded">★</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="">€{amt.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {Object.keys(memberBreakdown).length === 0 && <p className="text-xs text-muted-foreground">Sin aportaciones</p>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
