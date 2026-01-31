"use client"

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ManageGoalDialog, GoalTransactionDialog, GoalHistoryDialog } from "./goal-dialogs"
import { Pencil, Calendar, TrendingUp, PiggyBank, Minus } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type Member = { id: string; nickname?: string; user_id?: string }
type Goal = {
    id: string
    name: string
    target_amount: number
    current_amount: number
    deadline?: string
}
type Contribution = { id?: string; member_id: string; amount: number; date?: string; comment?: string }

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function GoalCard({
    goal,
    contributions,
    members
}: {
    goal: Goal
    contributions: Contribution[]
    members: Member[]
}) {
    // Determine percent
    // Cap at 100 for visual sanity, but tracking allows overflow
    const percent = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    const displayPercent = (goal.current_amount / goal.target_amount) * 100
    const remaining = Math.max(goal.target_amount - goal.current_amount, 0)

    // Aggregate contributions by member for Chart
    const memberMap: Record<string, number> = {}
    contributions.forEach(c => {
        memberMap[c.member_id] = (memberMap[c.member_id] || 0) + Number(c.amount)
    })

    const chartData = Object.entries(memberMap)
        .filter(([, val]) => val > 0) // Only positive contributions for pie chart? 
        // What about withdrawals causing neg? A pie chart can't show negatives easy.
        // We'll filter > 0 for visualization of "Who put money in". 
        // Net contributions usually.
        .map(([mId, val], index) => {
            const m = members.find(mem => mem.id === mId)
            return {
                name: m?.nickname || (m?.user_id ? 'Yo' : `M${mId.slice(0, 2)}`),
                value: val
            }
        })

    return (
        <Card className="flex flex-col h-full hover:bg-accent/5 transition-colors group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-muted-foreground" />
                        {goal.name}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {goal.deadline ? (
                            <>
                                <Calendar className="h-3 w-3" />
                                {new Date(goal.deadline).toLocaleDateString()}
                            </>
                        ) : "Sin fecha límite"}
                    </div>
                </div>
                <ManageGoalDialog
                    goal={goal}
                    trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    }
                />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4">

                {/* STATUS & NUMBERS */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className="text-2xl font-bold tabular-nums">€{goal.current_amount.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground"> / €{goal.target_amount.toLocaleString()}</span>
                        </div>
                        <Badge variant={displayPercent >= 100 ? "default" : "outline"}>
                            {displayPercent.toFixed(0)}%
                        </Badge>
                    </div>
                    <Progress value={percent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                        Faltan €{remaining.toLocaleString()}
                    </p>
                </div>

                {/* VISUAL & ACTIONS */}
                <div className="flex items-center justify-between pt-4 border-t">
                    {/* CHART */}
                    <div className="w-[80px] h-[80px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        innerRadius={25}
                                        outerRadius={38}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val: number | undefined) => `€${(val || 0).toLocaleString()}`}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full rounded-full border-4 border-muted flex items-center justify-center">
                                <span className="text-[10px] text-muted-foreground">Vacío</span>
                            </div>
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2">
                        <GoalTransactionDialog
                            goalId={goal.id}
                            goalName={goal.name}
                            members={members}
                            type="withdraw"
                            trigger={
                                <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg">
                                    <Minus className="h-4 w-4" />
                                </Button>
                            }
                        />
                        <GoalTransactionDialog
                            goalId={goal.id}
                            goalName={goal.name}
                            members={members}
                            type="deposit"
                        />
                    </div>
                </div>

                {/* HISTORY PREVIEW */}
                <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">Últimos Movimientos</span>
                        <GoalHistoryDialog
                            goalName={goal.name}
                            contributions={contributions}
                            members={members}
                            trigger={
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                    Ver todos
                                </Button>
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        {[...contributions]
                            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                            .slice(0, 3)
                            .map(c => {
                                const m = members.find(mem => mem.id === c.member_id)
                                const isNegative = c.amount < 0
                                return (
                                    <div key={c.id || Math.random()} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isNegative ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                            <span className="font-medium truncate max-w-[80px]">
                                                {m?.nickname || (m?.user_id ? 'Yo' : `M${c.member_id.slice(0, 2)}`)}
                                            </span>
                                            <span className="text-muted-foreground truncate max-w-[100px]">{c.comment}</span>
                                        </div>
                                        <span className={isNegative ? 'text-rose-500' : 'text-emerald-500'}>
                                            {isNegative ? '' : '+'}{Number(c.amount).toLocaleString()}€
                                        </span>
                                    </div>
                                )
                            })
                        }
                        {contributions.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">Sin actividad reciente</p>
                        )}
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
