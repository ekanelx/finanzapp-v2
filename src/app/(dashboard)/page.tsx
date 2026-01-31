
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { redirect } from 'next/navigation'
import { TransactionForm } from '@/components/transaction-form'

export default async function DashboardPage() {
    const supabase = await createClient()

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth/login')
    }

    // 2. Get Household
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id, households(name)')
        .eq('user_id', user.id)
        .single()

    if (!member) {
        redirect('/onboarding')
    }

    const householdName = member.households && !Array.isArray(member.households)
        ? (member.households as any).name
        : 'Mi Hogar'

    // 3. Get Monthly Stats
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed

    // Format YYYY-MM-DD
    const startOfMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`

    // Next month calculation
    const nextMonthDate = new Date(year, month + 1, 1)
    const nextMonthStartStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

    // Fetch transactions for calculation
    const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .eq('household_id', member.household_id)
        .gte('date', startOfMonthStr)
        .lt('date', nextMonthStartStr)

    let income = 0
    let expenses = 0

    if (transactions) {
        transactions.forEach(t => {
            if (t.type === 'income') income += Number(t.amount)
            if (t.type === 'expense') expenses += Number(t.amount)
        })
    }

    const balance = income - expenses

    // 4. Fetch Recent Transactions (Limit 5)
    const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('household_id', member.household_id)
        .order('date', { ascending: false })
        .limit(5)

    // 5. Fetch Categories
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('household_id', member.household_id)
        .order('name')

    // 6. Fetch Investments Summary
    const { data: investmentProducts } = await supabase
        .from('investment_products')
        .select('id, name, platform')
        .eq('household_id', member.household_id)
        .order('created_at', { ascending: false })

    const { data: invContributions } = await supabase
        .from('investment_contributions')
        .select('product_id, amount')
        .eq('household_id', member.household_id)

    const invTotals: Record<string, number> = {}
    let invGrandTotal = 0
    invContributions?.forEach((c: any) => {
        const amt = Number(c.amount)
        invTotals[c.product_id] = (invTotals[c.product_id] || 0) + amt
        invGrandTotal += amt
    })

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Dashboard</h1>
                    <p className="text-muted-foreground">{householdName}</p>
                </div>
                <div className="flex items-center gap-4">
                    <TransactionForm categories={categories || []} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* INGRESOS */}
                <Card>
                    <CardHeader>
                        <CardDescription>Ingresos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500 tabular-nums tracking-tight">
                            €{income.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <span className="bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Mes</span>
                        </div>
                    </CardContent>
                </Card>

                {/* GASTOS */}
                <Card>
                    <CardHeader>
                        <CardDescription>Gastos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-rose-500 tabular-nums tracking-tight">
                            €{expenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <span className="bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Mes</span>
                        </div>
                    </CardContent>
                </Card>

                {/* BALANCE */}
                <Card>
                    <CardHeader>
                        <CardDescription className="text-muted-foreground">Balance Neto</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold tabular-nums tracking-tight ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            €{balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <span>Ahorro potencial</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* INVERSIONES */}
                <div className="col-span-4">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Inversiones</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {investmentProducts && investmentProducts.length > 0 ? (
                                <div className="space-y-6 mt-4">
                                    {investmentProducts.slice(0, 3).map((prod: any) => {
                                        const total = invTotals[prod.id] || 0
                                        return (
                                            <div key={prod.id} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border text-muted-foreground group-hover:bg-muted/80 transition-colors">
                                                        <span className="text-xs font-bold">{prod.name.slice(0, 2).toUpperCase()}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{prod.name}</p>
                                                        <p className="text-xs text-muted-foreground">{prod.platform}</p>
                                                    </div>
                                                </div>
                                                <div className="font-bold tabular-nums">€{total.toLocaleString()}</div>
                                            </div>
                                        )
                                    })}
                                    <div className="pt-4 border-t mt-4 flex justify-between items-center">
                                        <span className="text-sm font-medium text-muted-foreground">Total Patrimonio</span>
                                        <span className="text-xl font-bold text-primary">€{invGrandTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[200px] w-full flex items-center justify-center text-muted-foreground text-sm italic">
                                    Sin inversiones activas
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* TRANSACCIONES */}
                <div className="col-span-3">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Actividad Reciente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 mt-4">
                                {recentTransactions?.map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-9 w-9 rounded-full flex items-center justify-center border ${t.type === 'expense' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                                {t.type === 'expense' ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium leading-none mb-1 group-hover:text-primary transition-colors">{t.description}</p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {categories?.find((c: any) => c.id === t.category_id)?.name || 'Sin categoría'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`text-sm font-bold tabular-nums ${t.type === 'expense' ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                                            {t.type === 'expense' ? '-' : '+'}€{Number(t.amount).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                                {(!recentTransactions || recentTransactions.length === 0) && (
                                    <p className="text-sm text-muted-foreground italic text-center py-8">No hay movimientos aún.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
