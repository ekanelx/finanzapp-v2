"use client"

import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ThemeSelector() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="h-9 w-[300px] animate-pulse rounded-md bg-muted" />
    }

    return (
        <Tabs key="theme-selector" value={theme || "system"} onValueChange={setTheme} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="light">
                    <Sun className="mr-2 h-4 w-4" />
                    Claro
                </TabsTrigger>
                <TabsTrigger value="dark">
                    <Moon className="mr-2 h-4 w-4" />
                    Oscuro
                </TabsTrigger>
                <TabsTrigger value="system">
                    <Monitor className="mr-2 h-4 w-4" />
                    Sistema
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
