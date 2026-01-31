
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoalCard } from '@/components/goals/goal-card'
import { ManageGoalDialog } from '@/components/goals/goal-dialogs'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function GoalsPage() {
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

    // 1. Fetch Goals
    const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('household_id', member.household_id)
        .order('created_at', { ascending: false })

    // 2. Fetch Members (for names)
    const { data: members } = await supabase
        .from('household_members')
        .select('id, nickname, user_id')
        .eq('household_id', member.household_id)

    // 3. Fetch Contributions for Charts
    const { data: contributions } = await supabase
        .from('goal_contributions')
        .select('id, goal_id, member_id, amount, date, comment')
        // We could filter mostly by goal_id via IN(), but fetching all for this household is fine for MVP
        // Need to join goals to filter by household? Or just trust RLS?
        // Goals are secure, contributions rely on goal_id.
        // Let's filter by goal_id IN (goals.ids)
        .in('goal_id', goals?.map(g => g.id) || [])


    const contributionsByGoal: Record<string, any[]> = {}
    contributions?.forEach(c => {
        if (!contributionsByGoal[c.goal_id]) contributionsByGoal[c.goal_id] = []
        contributionsByGoal[c.goal_id].push(c)
    })

    // Totals
    const totalSaved = goals?.reduce((sum, g) => sum + Number(g.current_amount), 0) || 0
    const totalTarget = goals?.reduce((sum, g) => sum + Number(g.target_amount), 0) || 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Metas de Ahorro</h1>
                    <p className="text-muted-foreground">Huchas para tus sueños y objetivos.</p>
                </div>
                <ManageGoalDialog />
            </div>

            {/* HEADER METRICS */}
            <div className="flex gap-4">
                <div className="bg-card border border-border rounded-lg p-4 flex-1 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">Total Ahorrado</p>
                    <p className="text-2xl font-bold text-foreground">€{totalSaved.toLocaleString()}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 flex-1 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">Objetivo Global</p>
                    <p className="text-2xl font-bold text-muted-foreground">€{totalTarget.toLocaleString()}</p>
                </div>
            </div>

            {/* GOALS GRID */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {goals?.map(goal => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        members={members || []}
                        contributions={contributionsByGoal[goal.id] || []}
                    />
                ))}
            </div>

            {(!goals || goals.length === 0) && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Sin Metas</AlertTitle>
                    <AlertDescription>
                        No tienes ninguna hucha activa. ¡Crea una para empezar a ahorrar!
                    </AlertDescription>
                </Alert>
            )}
        </div>
    )
}
