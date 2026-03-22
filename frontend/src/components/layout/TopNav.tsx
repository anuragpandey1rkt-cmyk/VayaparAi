'use client'

import { usePathname } from 'next/navigation'
import { Bell, Sun, Moon, Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/store/authStore'

const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/upload': 'Upload Documents',
    '/insights': 'AI Insights',
    '/invoices': 'Invoices',
    '/vendors': 'Vendor Analytics',
    '/cashflow': 'Cashflow Forecast',
    '/alerts': 'Alerts Center',
    '/contracts': 'Contract Analysis',
    '/chat': 'AI Business Chat',
    '/settings': 'Settings',
}

export default function TopNav() {
    const pathname = usePathname()
    const { theme, setTheme } = useTheme()
    const { user } = useAuthStore()

    const title = pageTitles[pathname || ''] || 'VyaparAI'

    return (
        <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm shrink-0">
            <div>
                <h1 className="font-semibold text-lg">{title}</h1>
                <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Alerts bell */}
                <button className="w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                </div>
            </div>
        </header>
    )
}
