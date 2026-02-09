import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from '@/components/ui/progress'
import { AlertCircle, History } from 'lucide-react'
import { redirect } from 'next/navigation'
import { CreateBudgetButton } from '@/components/create-budget-button'
import { SeedCategoriesButton } from '@/components/seed-categories-button'
import { SetCategoryBudget } from '@/components/set-category-budget'
import { ManageCategoriesDialog } from '@/components/manage-categories-dialog'
import { BudgetMonthSelect } from '@/components/budget-month-select'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

function monthStartStr(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function occurrenceCount(windowMonths: number, everyMonths: number) {
    let count = 0
    for (let offset = 0; offset < windowMonths; offset += 1) {
        if (offset % everyMonths === 0) count += 1
    }
    return count
}

export default async function BudgetPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const supabase = await createClient()

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

    const now = new Date()
    const currentMonthStr = monthStartStr(now)

    let selectedMonthStr = typeof searchParams.month === 'string' ? searchParams.month : currentMonthStr
    if (isNaN(new Date(selectedMonthStr).getTime())) selectedMonthStr = currentMonthStr

    const periodParam = typeof searchParams.period === 'string' ? Number(searchParams.period) : 1
    const periodMonths = [1, 2, 3, 12].includes(periodParam) ? periodParam : 1

    const selectedDate = new Date(selectedMonthStr)
    const isPast = selectedMonthStr < currentMonthStr

    const rangeStartDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - (periodMonths - 1), 1)
    const rangeEndDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)

    const rangeStartStr = monthStartStr(rangeStartDate)
    const rangeEndStr = monthStartStr(rangeEndDate)

    const { data: existingBudgets } = await supabase
        .from('budgets')
        .select('month')
        .eq('household_id', activeHouseholdId)
        .eq('status', 'active')
        .order('month', { ascending: false })

    const monthSet = new Set(existingBudgets?.map(b => b.month) || [])
    monthSet.add(currentMonthStr)
    const availableMonths = Array.from(monthSet).sort().reverse()

    const { data: budget } = await supabase
        .from('budgets')
        .select('id')
        .eq('household_id', activeHouseholdId)
        .eq('month', selectedMonthStr)
        .maybeSingle()

    const { data: allCategories } = await supabase
        .from('categories')
        .select('id, name, type, description, default_budget, budget_period_months, sort_order')
        .eq('household_id', activeHouseholdId)
        .order('sort_order', { ascending: true })

    const categories = (allCategories || [])
        .filter(c => c.type === 'expense')
        .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.name.localeCompare(b.name))

    const { data: expenseTransactions } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('household_id', activeHouseholdId)
        .eq('type', 'expense')
        .eq('scope', 'shared')
        .gte('date', rangeStartStr)
        .lt('date', rangeEndStr)

    const { data: incomeTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('household_id', activeHouseholdId)
        .eq('type', 'income')
        .eq('scope', 'shared')
        .gte('date', rangeStartStr)
        .lt('date', rangeEndStr)

    const spentByCategory: Record<string, number> = {}
    expenseTransactions?.forEach(t => {
        if (t.category_id) spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Number(t.amount)
    })

    const budgetLines: Record<string, number> = {}
    if (budget) {
        const { data: lines } = await supabase
            .from('budget_lines')
            .select('category_id, amount')
            .eq('budget_id', budget.id)
            .eq('scope', 'shared')

        lines?.forEach(l => {
            budgetLines[l.category_id] = Number(l.amount)
        })
    }

    if (!categories || categories.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Presupuesto</h1>
                </div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Faltan Categorías</AlertTitle>
                    <AlertDescription>Necesitamos categorías para empezar.</AlertDescription>
                </Alert>
                <div className="flex flex-col items-center justify-center p-10 bg-muted/20 rounded-lg gap-4">
                    <SeedCategoriesButton />
                    <span className="text-xs text-muted-foreground">- O -</span>
                    <ManageCategoriesDialog categories={[]} />
                </div>
            </div>
        )
    }

    const totalIncome = incomeTransactions?.reduce((a, t) => a + Number(t.amount), 0) || 0

    const totals = categories.reduce((acc, cat) => {
        const hasOverride = budgetLines[cat.id] !== undefined
        const baseBudget = hasOverride ? budgetLines[cat.id] : (Number(cat.default_budget) || 0)
        const everyMonths = Number(cat.budget_period_months) || 1
        const occurrences = occurrenceCount(periodMonths, everyMonths)
        const expectedBudget = baseBudget * occurrences
        const spent = spentByCategory[cat.id] || 0

        acc.expected += expectedBudget
        acc.spent += spent
        return acc
    }, { expected: 0, spent: 0 })

    const totalRemaining = totals.expected - totals.spent
    const totalPercent = totals.expected > 0 ? (totals.spent / totals.expected) * 100 : 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                        Presupuesto
                        {isPast && (
                            <Badge variant="secondary" className="text-sm font-normal text-muted-foreground border-muted-foreground/30">
                                <History className="w-3 h-3 mr-1" /> Histórico
                            </Badge>
                        )}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Ventana: {periodMonths} mes(es), desde {rangeStartStr} hasta {selectedMonthStr}</p>
                </div>

                <div className="flex items-center gap-2">
                    <BudgetMonthSelect availableMonths={availableMonths} currentMonth={selectedMonthStr} periodMonths={periodMonths} />
                    <ManageCategoriesDialog categories={allCategories || []} />
                </div>
            </div>

            {!budget ? (
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
            ) : (
                <>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Resumen Global</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ingresos</p>
                                    <p className="text-2xl font-bold text-emerald-500">€{totalIncome.toFixed(0)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Presupuesto</p>
                                    <p className="text-2xl font-bold text-primary">€{totals.expected.toFixed(0)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Gastado</p>
                                    <p className={`text-2xl font-bold ${totals.spent > totals.expected && totals.expected > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                                        €{totals.spent.toFixed(0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Desviación</p>
                                    <p className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {totalRemaining >= 0 ? '+' : ''}€{totalRemaining.toFixed(0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Disponible real</p>
                                    <p className={`text-2xl font-bold ${(totalIncome - totals.spent) < 0 ? 'text-rose-500' : 'text-primary'}`}>
                                        €{(totalIncome - totals.spent).toFixed(0)}
                                    </p>
                                </div>
                            </div>
                            <Progress value={Math.min(totalPercent, 100)} className="h-2 mt-6 w-full" />
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {categories.map((cat) => {
                            const hasOverride = budgetLines[cat.id] !== undefined
                            const baseBudget = hasOverride ? budgetLines[cat.id] : (Number(cat.default_budget) || 0)
                            const everyMonths = Number(cat.budget_period_months) || 1
                            const occurrences = occurrenceCount(periodMonths, everyMonths)
                            const budgetAmt = baseBudget * occurrences
                            const spentAmt = spentByCategory[cat.id] || 0
                            const avgSpent = spentAmt / periodMonths

                            let percent = 0
                            if (budgetAmt > 0) percent = (spentAmt / budgetAmt) * 100
                            else if (spentAmt > 0) percent = 100

                            const deviation = budgetAmt - spentAmt
                            const isZeroBudget = budgetAmt === 0
                            let color = 'bg-emerald-500'
                            if (percent > 100) color = 'bg-rose-500'
                            else if (percent > 85) color = 'bg-amber-500'

                            return (
                                <Card key={cat.id} className="hover:border-primary/50 transition-all">
                                    <div className="flex flex-row items-center justify-between pb-2 p-6">
                                        <div className="space-y-1 overflow-hidden">
                                            <CardTitle className="text-base font-medium truncate">{cat.name}</CardTitle>
                                            <p className="text-xs text-muted-foreground">Cada {everyMonths === 1 ? 'mes' : `${everyMonths} meses`}</p>
                                        </div>
                                        <div className="flex items-center gap-2 pl-2">
                                            {budgetAmt > 0 && (
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${percent > 100 ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground'}`}>
                                                    {Math.round(percent)}%
                                                </span>
                                            )}
                                            <SetCategoryBudget budgetId={budget.id} categoryId={cat.id} categoryName={cat.name} currentAmount={baseBudget} />
                                        </div>
                                    </div>
                                    <CardContent className="pt-0 space-y-2">
                                        <div className="text-2xl font-bold tabular-nums">
                                            €{spentAmt.toFixed(0)}
                                            <span className="text-muted-foreground text-sm font-normal"> / €{budgetAmt.toFixed(0)}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Media gasto: €{avgSpent.toFixed(0)}/mes</p>
                                        <p className={`text-xs font-medium ${deviation < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            Desviación: {deviation >= 0 ? 'sobra' : 'faltan'} {Math.abs(deviation).toFixed(0)}€
                                        </p>

                                        {budgetAmt > 0 ? (
                                            <Progress value={Math.min(percent, 100)} className={`mt-4 h-2`} indicatorClassName={color} />
                                        ) : (
                                            <div className="mt-4 h-2 w-full bg-muted rounded-full" />
                                        )}

                                        <div className="flex justify-between items-center mt-3">
                                            <p className="text-xs text-muted-foreground">{isZeroBudget && spentAmt > 0 ? 'Sin presupuesto' : budgetAmt > 0 ? 'Disponible' : 'Sin asignar'}</p>
                                            <p className={`text-xs font-medium ${deviation < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {budgetAmt > 0 && `${deviation >= 0 ? '+' : ''}€${deviation.toFixed(0)}`}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </>
            )}

        </div>
    )
}
