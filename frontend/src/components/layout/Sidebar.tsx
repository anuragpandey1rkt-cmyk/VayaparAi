'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Brain,
    LayoutDashboard,
    Upload,
    Lightbulb,
    Store,
    TrendingUp,
    Bell,
    FileSignature,
    MessageSquare,
    Settings,
    ShieldCheck,
    LogOut,
    ChevronRight,
    History,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/upload', icon: Upload, label: 'Upload' },
    { href: '/insights', icon: Lightbulb, label: 'AI Insights' },
    { href: '/invoices', icon: FileSignature, label: 'Invoices' },
    { href: '/vendors', icon: Store, label: 'Vendors' },
    { href: '/cashflow', icon: TrendingUp, label: 'Cashflow' },
    { href: '/alerts', icon: Bell, label: 'Alerts' },
    { href: '/contracts', icon: ShieldCheck, label: 'Contracts' },
    { href: '/chat', icon: MessageSquare, label: 'AI Chat' },
    { href: '/audit', icon: History, label: 'Activity Log' },
    { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { user, clearAuth } = useAuthStore()
    const router = useRouter()

    const handleLogout = () => {
        clearAuth()
        router.push('/auth/login')
    }

    return (
        <aside className="w-60 h-screen bg-card border-r border-border flex flex-col shrink-0">
            {/* Logo */}
            <div className="px-4 h-16 flex items-center border-b border-border">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center shadow-md">
                        <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-sm">VyaparAI</span>
                        <div className="text-[10px] text-muted-foreground leading-none">{user?.company_name}</div>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                        >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span>{item.label}</span>
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-indicator"
                                    className="ml-auto w-1 h-4 bg-primary rounded-full"
                                />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User section */}
            <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2 px-3 py-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{user?.full_name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
                    </div>
                    <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-medium capitalize shrink-0">
                        {user?.plan}
                    </span>
                </div>
                <button
                    onClick={handleLogout}
                    className="sidebar-item w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    )
}
