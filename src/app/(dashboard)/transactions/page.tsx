
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { TransactionForm } from '@/components/transaction-form'
import { TransactionsToolbar } from '@/components/transactions-toolbar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { TransactionActions } from "@/components/transactions-actions"

export default async function TransactionsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const supabase = await createClient()

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 2. Get Household
    const { data: member } = await supabase
        .from('household_members')
        .select('household_id, id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    if (!member) return null

    // 2b. Get All Household Members (for filter) - Skipping complex join for now, pending Profiles

    // 3. Prepare Query Params
    const typeFilter = typeof searchParams.type === 'string' ? searchParams.type : null
    const categoryParam = typeof searchParams.category === 'string' ? searchParams.category : null
    const memberFilter = typeof searchParams.member === 'string' ? searchParams.member : null
    const sortParam = typeof searchParams.sort === 'string' ? searchParams.sort : 'date_desc'

    // 4. Fetch Transactions with Filters
    let query = supabase
        .from('transactions')
        .select('*')
        .eq('household_id', member.household_id)

    if (typeFilter) {
        query = query.eq('type', typeFilter)
    }
    if (categoryParam) {
        const catIds = categoryParam.split(',')
        query = query.in('category_id', catIds)
    }
    if (memberFilter) {
        query = query.eq('user_id', memberFilter)
    }

    // Sort
    const [sortCol, sortDir] = sortParam.split('_')
    query = query.order(sortCol === 'amount' ? 'amount' : 'date', { ascending: sortDir === 'asc' })

    const { data: transactions } = await query

    // 5. Fetch Categories
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('household_id', member.household_id)
        .order('name')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Transacciones</h1>
                    <p className="text-muted-foreground">Historial de movimientos.</p>
                </div>
                {/* Pass categories to the Create Form */}
                <TransactionForm categories={categories || []} />
            </div>

            <TransactionsToolbar
                categories={categories || []}
                members={[]}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Movimientos ({transactions?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions?.map((t) => (
                                <TableRow key={t.id} className="group">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{t.description}</span>
                                            {t.scope === 'member' && (
                                                <span className="text-[10px] text-muted-foreground">(Personal)</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {categories?.find(c => c.id === t.category_id)?.name || 'Sin categoría'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {t.date && format(new Date(t.date), "d MMM yyyy", { locale: es })}
                                    </TableCell>
                                    <TableCell className={`text-right font-bold tabular-nums ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {t.type === 'income' ? '+' : '-'}€{Number(t.amount).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <TransactionActions transaction={t} categories={categories || []} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!transactions || transactions.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                                        No hay transacciones que coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
