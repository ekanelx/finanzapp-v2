
import Link from 'next/link'
import { Home, PieChart, ArrowRightLeft, Target, Settings, Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardNav } from '@/components/dashboard-nav'
import { ThemeToggle } from '@/components/theme-toggle'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground p-4 md:flex">
                <div className="mb-8 flex items-center gap-2 px-2 text-xl font-bold">
                    <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
                        <span className="text-lg">ƒ</span>
                    </div>
                    <span className="font-semibold tracking-tight">Finanzapp</span>
                </div>
                <nav className="flex flex-col gap-2">
                    <DashboardNav />
                </nav>
                <div className="mt-auto px-2 mb-2">
                    <ThemeToggle />
                </div>
                <div className="">
                    <Button className="w-full gap-2">
                        <Plus className="h-4 w-4" /> Nuevo Gasto
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background px-4 md:hidden">
                <DashboardNav mobile />
            </nav>
        </div>
    )
}
