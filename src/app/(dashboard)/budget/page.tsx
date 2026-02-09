import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, History, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { redirect } from 'next/navigation'
import { CreateBudgetButton } from '@/components/create-budget-button'
import { SeedCategoriesButton } from '@/components/seed-categories-button'
import { ManageCategoriesDialog } from '@/components/manage-categories-dialog'
import { BudgetPeriodControl } from '@/components/budget/budget-period-control'
import { BudgetCategoryList } from '@/components/budget/category-list'
import { SetCategoryBudget } from '@/components/set-category-budget'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'

export default async function BudgetPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const supabase = await createClient()

    // 1. Auth & Context
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!member) redirect('/onboarding')
    const activeHouseholdId = member.household_id

    // 2. Parse Params
    const view = (searchParams.view as 'month' | 'range') || 'month'
    const range = parseInt((searchParams.range as string) || '3', 10)

    // Date Resolution (for Month View)
    const now = new Date()
    const currentMonthStr = format(now, 'yyyy-MM-dd')
    let selectedMonthStr = typeof searchParams.month === 'string' ? searchParams.month : currentMonthStr
    // Validate
    if (isNaN(new Date(selectedMonthStr).getTime())) selectedMonthStr = currentMonthStr

    const selectedDate = new Date(selectedMonthStr)
    const isPast = selectedMonthStr < format(startOfMonth(now), 'yyyy-MM-dd')

    // 3. Fetch Data

    // Categories
    const { data: allCategoriesRaw } = await supabase
        .from('categories')
        .select('id, name, type, description, default_budget, periodicity, sort_order, icon')
        .eq('household_id', activeHouseholdId)
        .order('sort_order', { ascending: true }) // Respect new sort order
        .order('name', { ascending: true }) // Fallback

    const categories = allCategoriesRaw?.filter(c => c.type === 'expense') || []

    // Helper: Monthly Equivalent
    const getMonthlyEquivalent = (amount: number | null, periodicity: string | null) => {
        if (!amount) return 0
        switch (periodicity) {
            case 'bimonthly': return amount / 2
            case 'quarterly': return amount / 3
            case 'yearly': return amount / 12
            default: return amount
        }
    }

    // --- LOGIC SPLIT: MONTH vs RANGE ---

    let monthlyStats: Record<string, any> = {}
    let rangeStats: Record<string, any> = {}

    // Global Summary Vars
    let summaryData = {
        income: 0,
        expense: 0,
        balance: 0,
        budgetTotal: 0,
        remaining: 0
    }

    // Budget Object (needed for ID in Month view)
    let budgetId: string | null = null
    let budgetLines: Record<string, number> = {}

    if (view === 'month') {
        // --- MONTH VIEW LOGIC ---

        // Fetch Budget
        const { data: budget } = await supabase
            .from('budgets')
            .select('id, month')
            .eq('household_id', activeHouseholdId)
            .eq('month', selectedMonthStr)
            .maybeSingle()

        budgetId = budget?.id || null

        // Fetch Budget Lines
        if (budget) {
            const { data: lines } = await supabase.from('budget_lines')
                .select('category_id, amount')
                .eq('budget_id', budget.id)
                .eq('scope', 'shared')
            lines?.forEach(l => budgetLines[l.category_id] = Number(l.amount))
        }

        // Fetch Transactions (for this month)
        const start = format(startOfMonth(selectedDate), 'yyyy-MM-dd')
        const end = format(endOfMonth(selectedDate), 'yyyy-MM-dd')

        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, category_id, type')
            .eq('household_id', activeHouseholdId)
            .eq('scope', 'shared')
            .gte('date', start)
            .lte('date', end)

        // Calculate Stats
        const spentMap: Record<string, number> = {}
        let totalIncome = 0
        let totalExpense = 0

        transactions?.forEach(t => {
            const amt = Number(t.amount)
            if (t.type === 'income') totalIncome += amt
            else {
                totalExpense += amt
                if (t.category_id) {
                    spentMap[t.category_id] = (spentMap[t.category_id] || 0) + amt
                }
            }
        })

        // Build Monthly Stats
        categories.forEach(cat => {
            // Priority: explicit budget line > calculated monthly equivalent of default
            const hasExplicit = budgetLines[cat.id] !== undefined
            const budgetAmt = hasExplicit
                ? budgetLines[cat.id]
                : getMonthlyEquivalent(cat.default_budget, cat.periodicity)

            const spent = spentMap[cat.id] || 0
            const remaining = budgetAmt - spent
            const percent = budgetAmt > 0 ? (spent / budgetAmt) * 100 : (spent > 0 ? 100 : 0)

            monthlyStats[cat.id] = {
                budget: budgetAmt,
                spent,
                remaining,
                percent
            }
        })

        // Rollover (simplified for now, reused logic if needed, but keeping it simple for this refactor)
        // Note: For now omitting rollover to focus on new core features, or calculate simply?
        // Let's keep it simple: "Available" is sum of budgets.

        const totalBudget = Object.values(monthlyStats).reduce((sum, s) => sum + s.budget, 0)

        summaryData = {
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense,
            budgetTotal: totalBudget,
            remaining: totalBudget - totalExpense
        }

    } else {
        // --- RANGE VIEW LOGIC ---

        const endDate = endOfMonth(now) // Up to end of current month? Or today? Let's say today/now. 
        // Actually typically "Last 3 Months" means [Now-3m, Now].
        const startDate = startOfMonth(subMonths(now, range - 1)) // -1 to include current? 
        // If range=3: Current, Prev, PrevPrev.
        // Let's use strict date range.
        const startStr = format(startDate, 'yyyy-MM-dd')
        const endStr = format(endDate, 'yyyy-MM-dd')

        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, category_id, type, date')
            .eq('household_id', activeHouseholdId)
            .eq('scope', 'shared')
            .gte('date', startStr)
            .lte('date', endStr)

        let totalIncome = 0
        let totalExpense = 0
        const spentMap: Record<string, number> = {}

        transactions?.forEach(t => {
            const amt = Number(t.amount)
            if (t.type === 'income') totalIncome += amt
            else {
                totalExpense += amt
                if (t.category_id) {
                    spentMap[t.category_id] = (spentMap[t.category_id] || 0) + amt
                }
            }
        })

        categories.forEach(cat => {
            // Projected budget for N months
            const monthlyEq = getMonthlyEquivalent(cat.default_budget, cat.periodicity)
            const projectedBudget = monthlyEq * range
            const totalSpent = spentMap[cat.id] || 0
            const avgSpent = totalSpent / range
            const deviation = projectedBudget - totalSpent // Positive = Under budget (Good), Negative = Over budget
            const percent = projectedBudget > 0 ? (totalSpent / projectedBudget) * 100 : 0

            rangeStats[cat.id] = {
                totalSpent,
                avgSpent,
                projectedBudget,
                deviation,
                percent
            }
        })

        summaryData = {
            income: totalIncome,
            expense: totalExpense,
            balance: totalIncome - totalExpense,
            budgetTotal: Object.values(rangeStats).reduce((sum, s) => sum + s.projectedBudget, 0),
            remaining: 0 // Not relevant for range? Or is "Total Deviation"
        }
        summaryData.remaining = summaryData.budgetTotal - totalExpense // Deviation globally
    }

    // --- RENDER ---

    if (categories.length === 0) {
        return (
            <div className="space-y-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Faltan Categorías</AlertTitle>
                    <AlertDescription>Necesitamos categorías para empezar.</AlertDescription>
                </Alert>
                <div className="flex flex-col items-center p-10 gap-4">
                    <SeedCategoriesButton />
                    <ManageCategoriesDialog categories={[]} />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                        Presupuesto
                        {view === 'month' && isPast && (
                            <Badge variant="secondary" className="text-sm font-normal text-muted-foreground border-muted-foreground/30">
                                <History className="w-3 h-3 mr-1" /> Histórico
                            </Badge>
                        )}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <ManageCategoriesDialog categories={allCategoriesRaw || []} />
                </div>
            </div>

            {/* CONTROLS */}
            <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg">
                <BudgetPeriodControl currentMonth={selectedDate} />
            </div>

            {/* ERROR STATE: Missing Budget (Month View Only) */}
            {view === 'month' && !budgetId && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Sin Presupuesto</AlertTitle>
                    <AlertDescription>
                        {selectedMonthStr === currentMonthStr
                            ? "No hay presupuesto activo para este mes."
                            : `No se creó presupuesto en ${selectedMonthStr}.`
                        }
                    </AlertDescription>
                    {selectedMonthStr === currentMonthStr && (
                        <div className="mt-4">
                            <CreateBudgetButton month={selectedMonthStr} />
                        </div>
                    )}
                </Alert>
            )}

            {/* SUMMARY CARDS */}
            {(budgetId || view === 'range') && (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ingresos {view === 'range' ? `(${range}m)` : ''}</CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">€{summaryData.income.toFixed(0)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Gastos {view === 'range' ? `(${range}m)` : ''}</CardTitle>
                                <TrendingDown className="h-4 w-4 text-rose-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">€{summaryData.expense.toFixed(0)}</div>
                                <p className="text-xs text-muted-foreground">
                                    de €{summaryData.budgetTotal.toFixed(0)} proyectado
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
                                <Wallet className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${summaryData.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {summaryData.balance >= 0 ? '+' : ''}€{summaryData.balance.toFixed(0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {view === 'month' ? 'Disponible' : 'Desviación'}
                                </CardTitle>
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${summaryData.remaining >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {summaryData.remaining >= 0 ? '+' : ''}€{summaryData.remaining.toFixed(0)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {summaryData.remaining >= 0 ? 'A favor' : 'En contra'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* MAIN LIST */}
                    <BudgetCategoryList
                        categories={categories}
                        view={view}
                        range={range}
                        monthlyStats={monthlyStats}
                        rangeStats={rangeStats}
                        budgetId={budgetId}
                    />
                </>
            )}
        </div>
    )
}
