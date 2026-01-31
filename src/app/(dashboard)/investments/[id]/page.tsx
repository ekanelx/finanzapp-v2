
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, User, Wallet } from 'lucide-react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { AddContributionDialog } from '@/components/add-contribution-dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

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

    // 4. Fetch Members for Name Mapping (Naive approach: assume we have emails or just use IDs? 
    // Wait, household_members usually has joined user data if we join tables. 
    // But since auth is separate, we might not have names.
    // Let's check `household_members` table schema again. It links to `auth.users`.
    // We can't join `auth.users` easily.
    // We will use "Miembro [First 4 chars of ID]" or just "Yo" if it matches current user.
    // Ideally we should have a `profiles` table.
    // For MVP, if it matches `member.id`, we say "Yo".

    // Fetch all members of household to build a dropdown list
    const { data: allMembers } = await supabase
        .from('household_members')
        .select('id, user_id, role') // We don't have name/email here unfortunately
        .eq('household_id', member.household_id)

    // We need names. Since we don't have a profiles table, we'll improvise:
    // "Usuario 1", "Usuario 2" or rely on client-side knowledge? No.
    // Let's check if we can get email from auth.users? No RLS usually blocks it.
    // We will just label them by their ID short code or "Yo".

    const membersList = allMembers?.map(m => ({
        household_member_id: m.id,
        name: m.user_id === user.id ? 'Yo' : `Miembro ${m.id.substring(0, 4)}`
    })) || []

    const currentMemberId = member.id

    // CALCS
    const totalInvested = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0

    const byMember: Record<string, number> = {}
    contributions?.forEach(c => {
        byMember[c.member_id] = (byMember[c.member_id] || 0) + Number(c.amount)
    })

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div>
                <Link href="/investments" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
                    <ArrowLeft className="mr-1 h-3 w-3" /> Volver a Inversiones
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-muted-foreground">{product.platform || 'Sin plataforma'}</Badge>
                            <span className="text-sm text-muted-foreground">• Creado el {new Date(product.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <AddContributionDialog
                        productId={product.id}
                        productName={product.name}
                        members={membersList}
                        currentMemberId={currentMemberId}
                    />
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Acumulado</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{totalInvested.toLocaleString()}</div>
                    </CardContent>
                </Card>
                {/* Breakdown per member */}
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
                                    {((amount / totalInvested) * 100).toFixed(1)}% del total
                                </p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* HISTORY TABLE & ACTIONS - Encapsulating interactive part in a Client Component if possible, 
                but since we are in a server component page, we can use a client component for the table or just the actions.
                To keep it simple, let's make a new client component `ContributionList` that handles the list and actions?
                
                OR simpler: make a `ContributionActionsRef` component that takes the contribution and handles visuals.
            */}
            <ContributionsTable contributions={contributions} members={membersList} />
        </div>
    )
}

// Client Component for the table to handle Dialog state
import { ContributionsTable } from "@/components/investments/contributions-table"
