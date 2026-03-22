'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    Users, FileText, IndianRupee, TrendingUp, Building,
    Activity, BarChart3, ShieldAlert,
} from 'lucide-react'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export default function AdminPage() {
    const { user } = useAuthStore()
    const router = useRouter()

    useEffect(() => {
        if (user && user.role !== 'admin' && user.role !== 'owner') {
            router.push('/dashboard')
        }
    }, [user, router])

    const { data: metrics, isLoading } = useQuery({
        queryKey: ['admin-metrics'],
        queryFn: () => adminApi.metrics().then((r) => r.data),
        refetchInterval: 60000,
    })

    const { data: tenantsData } = useQuery({
        queryKey: ['admin-tenants'],
        queryFn: () => adminApi.tenants({ per_page: 10 }).then((r) => r.data),
    })

    const platform = metrics?.platform || {}
    const subscriptions = metrics?.subscriptions?.by_plan || {}
    const tenants = tenantsData?.tenants || []

    const planChartData = Object.entries(subscriptions).map(([plan, count]) => ({
        name: plan.charAt(0).toUpperCase() + plan.slice(1),
        count: count as number,
    }))

    const PLAN_COLORS = { Starter: 'hsl(238 75% 60%)', Pro: 'hsl(260 70% 60%)', Enterprise: 'hsl(290 60% 55%)' }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="glass-card border border-border h-28"><div className="p-5 space-y-3"><div className="skeleton h-7 w-20" /><div className="skeleton h-4 w-28" /></div></div>)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                    <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Admin Panel</h2>
                    <p className="text-muted-foreground text-sm">Platform-wide metrics and tenant management</p>
                </div>
            </div>

            {/* MRR / ARR Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-6 border border-emerald-500/20 bg-emerald-500/5"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-muted-foreground">Monthly Recurring Revenue</span>
                    </div>
                    <div className="text-4xl font-bold text-emerald-400">
                        ₹{((metrics?.mrr_inr || 0) / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        ARR: ₹{((metrics?.arr_inr || 0) / 100000).toFixed(2)}L
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    className="glass-card p-6 border border-blue-500/20 bg-blue-500/5"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-muted-foreground">Active Tenants</span>
                    </div>
                    <div className="text-4xl font-bold text-blue-400">{platform.total_tenants || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {platform.active_users || 0} active users total
                    </div>
                </motion.div>
            </div>

            {/* Platform Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Documents', value: platform.total_documents || 0, sub: `${platform.processed_documents || 0} processed`, icon: FileText, color: 'bg-blue-500/15 text-blue-400' },
                    { label: 'Invoice Value', value: `₹${((platform.total_invoice_value || 0) / 100000).toFixed(1)}L`, sub: `${platform.total_invoices || 0} invoices`, icon: IndianRupee, color: 'bg-amber-500/15 text-amber-400' },
                    { label: 'Active Alerts', value: platform.active_alerts || 0, sub: 'Unresolved', icon: ShieldAlert, color: 'bg-red-500/15 text-red-400' },
                    { label: 'Chat Messages', value: platform.total_chat_messages || 0, sub: 'Total RAG queries', icon: Activity, color: 'bg-purple-500/15 text-purple-400' },
                ].map((m) => (
                    <div key={m.label} className="glass-card border border-border p-5">
                        <div className={`w-9 h-9 rounded-lg ${m.color} flex items-center justify-center mb-3`}>
                            <m.icon className="w-4 h-4" />
                        </div>
                        <div className="text-2xl font-bold">{m.value}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">{m.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subscription Distribution */}
                <div className="glass-card border border-border p-6">
                    <h3 className="font-semibold mb-4">Subscription Distribution</h3>
                    {planChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={planChartData}>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="glass-card p-2 border border-border text-xs"><div>{payload[0].payload.name}: {payload[0].value} tenants</div></div> : null} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {planChartData.map((entry) => (
                                        <Cell key={entry.name} fill={PLAN_COLORS[entry.name as keyof typeof PLAN_COLORS] || 'hsl(238 75% 60%)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-muted-foreground py-12 text-sm">No subscription data yet</div>
                    )}
                </div>

                {/* Recent Tenants */}
                <div className="glass-card border border-border p-6">
                    <h3 className="font-semibold mb-4">Recent Tenants</h3>
                    <div className="space-y-3">
                        {tenants.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8 text-sm">No tenants yet</div>
                        ) : (
                            tenants.map((tenant: any) => (
                                <div key={tenant.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {tenant.name?.charAt(0) || 'T'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{tenant.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {tenant.user_count} users · {tenant.document_count} docs · {new Date(tenant.created_at).toLocaleDateString('en-IN')}
                                        </div>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${tenant.plan === 'enterprise' ? 'bg-purple-500/15 text-purple-400' :
                                            tenant.plan === 'pro' ? 'bg-blue-500/15 text-blue-400' :
                                                'bg-muted text-muted-foreground'
                                        }`}>
                                        {tenant.plan}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
