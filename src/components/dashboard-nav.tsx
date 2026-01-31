"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PieChart, ArrowRightLeft, Target, Settings, TrendingUp } from 'lucide-react'

export function DashboardNav({ mobile = false }: { mobile?: boolean }) {
    const pathname = usePathname()
    const links = [
        { href: '/', label: 'Dashboard', icon: Home },
        { href: '/budget', label: 'Presupuesto', icon: PieChart },
        { href: '/transactions', label: 'Movimientos', icon: ArrowRightLeft },
        { href: '/investments', label: 'Inversiones', icon: TrendingUp },
        { href: '/goals', label: 'Metas', icon: Target },
        { href: '/settings', label: 'Ajustes', icon: Settings },
    ]

    if (mobile) {
        return (
            <>
                {links.map((link) => {
                    const isActive = pathname === link.href
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex flex-col items-center gap-1 text-xs transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <link.icon className="h-5 w-5" />
                            <span>{link.label}</span>
                        </Link>
                    )
                })}
            </>
        )
    }

    return (
        <>
            {links.map((link) => {
                const isActive = pathname === link.href
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-sm font-medium ${isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            }`}
                    >
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                    </Link>
                )
            })}
        </>
    )
}
