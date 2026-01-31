
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Plus, AlertCircle, History } from 'lucide-react'
import { redirect } from 'next/navigation'
import { CreateBudgetButton } from '@/components/create-budget-button'
import { SeedCategoriesButton } from '@/components/seed-categories-button'
import { SetCategoryBudget } from '@/components/set-category-budget'
import { ManageCategoriesDialog } from '@/components/manage-categories-dialog'
import { BudgetMonthSelect } from '@/components/budget-month-select'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default async function BudgetPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const supabase = await createClient()

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // 2. Get Household
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) redirect('/onboarding')

    const activeHouseholdId = member.household_id

    // 3. Date Resolution
    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    // Requested month from URL or Default
    let selectedMonthStr = typeof searchParams.month === 'string' ? searchParams.month : currentMonthStr

    // If param is invalid, fallback
    if (isNaN(new Date(selectedMonthStr).getTime())) {
        selectedMonthStr = currentMonthStr
    }

    const selectedDate = new Date(selectedMonthStr)
    const isPast = selectedMonthStr < currentMonthStr

    // Calculate start/end for transactions
    // FIX: Use YYYY-MM-DD strings and semi-open interval
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()

    const startOfMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`

    const nextMonthDate = new Date(year, month + 1, 1)
    const nextMonthStartStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

    // 4. Fetch Available Budget Months (for History Selector)
    const { data: existingBudgets } = await supabase
        .from('budgets')
        .select('month')
        .eq('household_id', activeHouseholdId)
        .eq('status', 'active') // Or closed too
        .order('month', { ascending: false })

    // Create unique list of months including current (even if not created yet, we allow selecting current)
    const monthSet = new Set(existingBudgets?.map(b => b.month) || [])
    monthSet.add(currentMonthStr)
    const availableMonths = Array.from(monthSet).sort().reverse()

    // 5. Fetch Active Budget for Selected Month
    const { data: budget } = await supabase
        .from('budgets')
        .select('id')
        .eq('household_id', activeHouseholdId)
        .eq('month', selectedMonthStr)
        .maybeSingle()

    // 6. Fetch Categories (ALL for Manager, Expense for Cards)
    const { data: allCategories } = await supabase
        .from('categories')
        .select('id, name, type, description, default_budget')
        .eq('household_id', activeHouseholdId)
        .order('name')

    const categories = allCategories?.filter(c => c.type === 'expense') || []

    // 7. Fetch Transactions 
    const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('household_id', activeHouseholdId)
        .eq('type', 'expense')
        .eq('scope', 'shared')
        .gte('date', startOfMonthStr)
        .lt('date', nextMonthStartStr)

    // Aggregate
    const spentByCategory: Record<string, number> = {}
    transactions?.forEach(t => {
        if (t.category_id) {
            spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + Number(t.amount)
        }
    })

    // 8. Fetch Budget Lines
    let budgetLines: Record<string, number> = {}
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

    // --- EMPTY STATE 1: No Categories (Admin needed) ---
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

    // --- VIEW: Display Dashboard ---

    // --- ROLLEVER LOGIC ---
    // Calculate Prev Month
    const prevMonthDate = new Date(year, month - 1, 1)
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`

    // Fetch Prev Budget & Spent
    // 1. Prev Budget Lines
    const { data: prevBudgetLinesData } = await supabase
        .from('budget_lines')
        .select('amount')
        .eq('scope', 'shared')
        .eq('budgets.household_id', activeHouseholdId) // This join syntax relies on relation, check Supabase ability. 
    // Actually simpler to filter by budget_id if we get it first.

    // Let's do it cleaner: Get Prev Budget ID first.
    const { data: prevBudget } = await supabase
        .from('budgets')
        .select('id')
        .eq('household_id', activeHouseholdId)
        .eq('month', prevMonthStr)
        .maybeSingle()

    let prevRemaining = 0

    if (prevBudget) {
        // Prev Budget Sum
        const { data: pLines } = await supabase
            .from('budget_lines')
            .select('amount')
            .eq('budget_id', prevBudget.id)
            .eq('scope', 'shared')

        const prevBudgetSum = pLines?.reduce((sum, l) => sum + Number(l.amount), 0) || 0

        // Prev Spent Sum
        const prevStart = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1).toISOString()
        const prevEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).toISOString()

        const { data: pTrans } = await supabase
            .from('transactions')
            .select('amount')
            .eq('household_id', activeHouseholdId)
            .eq('type', 'expense')
            .eq('scope', 'shared')
            .gte('date', prevStart)
            .lte('date', prevEnd)

        const prevSpentSum = pTrans?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

        prevRemaining = prevBudgetSum - prevSpentSum
        // Only rollover positive amounts? Usually yes. If negative, do we subtract? 
        // Let's assume debt carries over too (negative rollover), or just 0? 
        // "Añadelo -> surplus". Usually debt is absorbed. 
        // Let's carry over EVERYTHING (positive or negative) to be strict.
    }

    // --- VIEW: Display Dashboard ---

    // Calculate Totals
    const totalBudget = Object.values(budgetLines).reduce((a, b) => a + b, 0)
    const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + b, 0)

    // Effective Remaining = (Budget + Rollover) - Spent
    const effectiveBudget = totalBudget + prevRemaining
    const remaining = effectiveBudget - totalSpent
    const totalPercent = effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : 0

    return (
        <div className="space-y-6">
            {/* HEADER */}
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
                </div>

                <div className="flex items-center gap-2">
                    <BudgetMonthSelect
                        availableMonths={availableMonths}
                        currentMonth={selectedMonthStr}
                    />
                    <ManageCategoriesDialog categories={allCategories || []} />
                </div>
            </div>

            {/* If no budget for THIS OLD MONTH, show info instead of Create Button (unless we want to allow back-creating?) */}
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

                    {/* TOTALS SUMMARY */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Resumen Global</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Disponible</p>
                                    <div className="flex flex-col items-center">
                                        <p className="text-2xl font-bold text-primary">€{effectiveBudget.toFixed(0)}</p>
                                        {prevRemaining !== 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.5 mt-1 rounded-full ${prevRemaining > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                {prevRemaining > 0 ? '+' : ''}€{prevRemaining.toFixed(0)} prev
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Gastado</p>
                                    <p className={`text-2xl font-bold ${totalSpent > effectiveBudget && effectiveBudget > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                                        €{totalSpent.toFixed(0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Restante</p>
                                    <p className={`text-2xl font-bold ${remaining < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {remaining >= 0 ? '+' : ''}€{remaining.toFixed(0)}
                                    </p>
                                </div>
                            </div>
                            <Progress value={Math.min(totalPercent, 100)} className="h-2 mt-6 w-full" />
                        </CardContent>
                    </Card>

                    {/* CATEGORY GRID */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {categories.map((cat) => {
                            // UX: Use override (budgetLines) if available, otherwise default_budget from category
                            const monthlyOverride = budgetLines[cat.id]
                            // The logic: 
                            // 1. If budgetLines has an entry, using it (even if 0, though usually means explict 0). 
                            // But `budgetLines` map does not distinguish between "undefined" and "0" easily if undefined means not present.
                            // In my map `budgetLines[l.category_id] = Number(l.amount)`. So if not present -> undefined.

                            const hasOverride = budgetLines[cat.id] !== undefined
                            const budgetAmt = hasOverride ? budgetLines[cat.id] : (Number(cat.default_budget) || 0)

                            const spentAmt = spentByCategory[cat.id] || 0

                            let percent = 0
                            if (budgetAmt > 0) percent = (spentAmt / budgetAmt) * 100
                            else if (spentAmt > 0) percent = 100

                            const isZeroBudget = budgetAmt === 0
                            let color = 'bg-primary'
                            if (percent > 100) color = 'bg-rose-500'
                            else if (percent > 85) color = 'bg-amber-500'
                            else color = 'bg-emerald-500'

                            if (isZeroBudget && spentAmt > 0) color = 'bg-rose-500'

                            return (
                                <Card key={cat.id} className="hover:border-primary/50 transition-all">
                                    <div className="flex flex-row items-center justify-between pb-2 p-6">
                                        <div className="space-y-1 overflow-hidden">
                                            <CardTitle className="text-base font-medium truncate">{cat.name}</CardTitle>
                                            {cat.description && (
                                                <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={cat.description}>
                                                    {cat.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 pl-2">
                                            {budgetAmt > 0 && (
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${percent > 100 ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground'}`}>
                                                    {Math.round(percent)}%
                                                </span>
                                            )}
                                            <SetCategoryBudget
                                                budgetId={budget.id}
                                                categoryId={cat.id}
                                                categoryName={cat.name}
                                                currentAmount={budgetAmt}
                                            />
                                        </div>
                                    </div>
                                    <CardContent className="pt-0">
                                        <div className="text-2xl font-bold tabular-nums">
                                            €{spentAmt.toFixed(0)}
                                            <span className="text-muted-foreground text-sm font-normal"> / €{budgetAmt.toFixed(0)}</span>
                                        </div>

                                        {budgetAmt > 0 ? (
                                            <Progress
                                                value={Math.min(percent, 100)}
                                                className={`mt-4 h-2`}
                                                indicatorClassName={color}
                                            />
                                        ) : (
                                            <div className="mt-4 h-2 w-full bg-muted rounded-full relative overflow-hidden">
                                                <div className="absolute inset-0 bg-muted repeating-linear-gradient-45"></div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center mt-3">
                                            <p className="text-xs text-muted-foreground">
                                                {isZeroBudget && spentAmt > 0 ? 'Sin presupuesto' :
                                                    budgetAmt > 0 ? 'Disponible' : 'Sin asignar'}
                                            </p>
                                            <p className={`text-xs font-medium ${budgetAmt - spentAmt < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {budgetAmt > 0 && `€${(budgetAmt - spentAmt).toFixed(0)}`}
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
