'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    Activity, AlertTriangle, TrendingUp, TrendingDown, FileText,
    ShieldAlert, IndianRupee, CheckCircle2, XCircle, Clock, Zap, Receipt, ShoppingBag
} from 'lucide-react'
import { dashboardApi } from '@/lib/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

function StatCard({ title, value, subtitle, icon: Icon, color, href }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="metric-card border border-border hover:border-border/60 transition-all cursor-pointer"
        >
            <Link href={href || '#'} className="block">
                <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                    </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{title}</div>
                {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
            </Link>
        </motion.div>
    )
}

const alertSeverityClass = {
    critical: 'badge-critical',
    warning: 'badge-warning',
    info: 'badge-info',
}

export default function DashboardPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: () => dashboardApi.summary().then((r) => r.data),
        refetchInterval: 30000,
    })

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="metric-card border border-border h-32">
                            <div className="skeleton h-9 w-9 rounded-lg mb-3" />
                            <div className="skeleton h-7 w-20 mb-2" />
                            <div className="skeleton h-4 w-24" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const summary = data || {}
    const healthScore = summary.health_score || 0
    const riskScore = summary.risk_score || 0
    const docs = summary.documents || {}
    const invoices = summary.invoices || {}
    const alerts = summary.alerts || {}
    const cashflow = summary.cashflow

    // Cashflow mini chart (last 7 days from daily_forecast)
    const chartData = cashflow?.daily_forecast?.slice(0, 7) || []

    const healthColor = healthScore >= 70
        ? 'text-emerald-400'
        : healthScore >= 40
            ? 'text-amber-400'
            : 'text-red-400'

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Business Overview</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">Real-time insights from your documents</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="status-dot-green" />
                    <span className="text-xs text-muted-foreground">Live data</span>
                </div>
            </div>

            {/* Health & Risk Score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-6 flex items-center gap-6 border border-emerald-500/20 bg-emerald-500/5"
                >
                    <div className="relative w-20 h-20">
                        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
                            <circle
                                cx="18" cy="18" r="15.9"
                                fill="none" stroke="hsl(142 76% 36%)"
                                strokeWidth="2.5"
                                strokeDasharray={`${healthScore} ${100 - healthScore}`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-lg font-bold ${healthColor}`}>{Math.round(healthScore)}</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Business Health Score</div>
                        <div className={`text-3xl font-bold ${healthColor}`}>{Math.round(healthScore)}/100</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {healthScore >= 70 ? '✓ Healthy' : healthScore >= 40 ? '⚠ Needs Attention' : '✗ Critical'}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    className="glass-card p-6 flex items-center gap-6 border border-red-500/20 bg-red-500/5"
                >
                    <div className="relative w-20 h-20">
                        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
                            <circle
                                cx="18" cy="18" r="15.9"
                                fill="none" stroke="hsl(0 84% 60%)"
                                strokeWidth="2.5"
                                strokeDasharray={`${riskScore} ${100 - riskScore}`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold text-red-400">{Math.round(riskScore)}</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Risk Score</div>
                        <div className="text-3xl font-bold text-red-400">{Math.round(riskScore)}/100</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {alerts.critical > 0 ? `${alerts.critical} critical alerts` : 'No critical issues'}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Documents Processed"
                    value={docs.completed || 0}
                    subtitle={`${docs.total || 0} total uploaded`}
                    icon={FileText}
                    color="bg-blue-500/15 text-blue-400"
                    href="/upload"
                />
                <StatCard
                    title="Outstanding Invoices"
                    value={`₹${((invoices.unpaid_amount || 0) / 100000).toFixed(1)}L`}
                    subtitle={`${invoices.unpaid_count || 0} unpaid invoices`}
                    icon={IndianRupee}
                    color="bg-amber-500/15 text-amber-400"
                    href="/invoices"
                />
                <StatCard
                    title="Active Alerts"
                    value={alerts.total_active || 0}
                    subtitle={`${alerts.critical || 0} critical, ${alerts.warning || 0} warnings`}
                    icon={AlertTriangle}
                    color="bg-red-500/15 text-red-400"
                    href="/alerts"
                />
                <StatCard
                    title="Fraud Flags"
                    value={(invoices.duplicates || 0) + (invoices.gst_issues || 0)}
                    subtitle={`${invoices.duplicates || 0} duplicates, ${invoices.gst_issues || 0} GST issues`}
                    icon={ShieldAlert}
                    color="bg-purple-500/15 text-purple-400"
                    href="/invoices"
                />
                <StatCard
                    title="Total Spending"
                    value={`₹${((summary.spending?.total_spend || 0) / 100000).toFixed(1)}L`}
                    subtitle="Last 30 days"
                    icon={ShoppingBag}
                    color="bg-blue-500/15 text-blue-400"
                    href="/spending"
                />
                <StatCard
                    title="GST Net Payable"
                    value={`₹${(Math.abs(summary.gst?.net_payable || 0)).toLocaleString('en-IN')}`}
                    subtitle={summary.gst?.status === 'surplus' ? 'GST Surplus (ITC > Liability)' : 'GST Liability'}
                    icon={Receipt}
                    color={summary.gst?.status === 'surplus' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/15 text-primary'}
                    href="/gst"
                />
            </div>

            {/* AI Insight Highlights */}
            {summary.latest_insight && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex gap-4 items-center group cursor-pointer hover:bg-primary/10 transition-colors"
                >
                    <Link href="/insights" className="flex gap-4 items-center w-full">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold uppercase tracking-wider text-primary/80">Premium AI Insight</span>
                                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-[10px] font-bold text-primary">Impact: {summary.latest_insight.impact_score}/10</span>
                            </div>
                            <h4 className="font-semibold text-foreground truncate">{summary.latest_insight.title}</h4>
                            <p className="text-sm text-muted-foreground truncate">{summary.latest_insight.recommendation}</p>
                        </div>
                        <div className="hidden sm:block text-primary group-hover:translate-x-1 transition-transform">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </Link>
                </motion.div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cashflow Chart */}
                <div className="glass-card p-6 border border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Cashflow Forecast (30 Days)</h3>
                        <Link href="/cashflow" className="text-xs text-primary hover:underline">View Full →</Link>
                    </div>
                    {cashflow ? (
                        <div>
                            <div className="text-2xl font-bold mb-1">
                                ₹{(cashflow.predicted_balance / 100000).toFixed(1)}L
                            </div>
                            <div className="text-xs text-muted-foreground mb-4">Predicted balance in 30 days</div>
                            {chartData.length > 0 && (
                                <ResponsiveContainer width="100%" height={120}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(238 75% 60%)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(238 75% 60%)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" hide />
                                        <YAxis hide />
                                        <Tooltip
                                            content={({ active, payload }) =>
                                                active && payload?.length ? (
                                                    <div className="glass-card p-2 text-xs border border-border">
                                                        <div>Date: {payload[0].payload.date}</div>
                                                        <div>Balance: ₹{Number(payload[0].value).toLocaleString('en-IN')}</div>
                                                    </div>
                                                ) : null
                                            }
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="balance"
                                            stroke="hsl(238 75% 60%)"
                                            strokeWidth={2}
                                            fill="url(#balanceGrad)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                            Upload bank statements to see cashflow forecast
                        </div>
                    )}
                </div>

                {/* Recent Alerts */}
                <div className="glass-card p-6 border border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Recent Alerts</h3>
                        <Link href="/alerts" className="text-xs text-primary hover:underline">View All →</Link>
                    </div>
                    <div className="space-y-3">
                        {summary.recent_alerts?.length > 0 ? (
                            summary.recent_alerts.map((alert: any) => (
                                <div key={alert.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{alert.title}</div>
                                        <div className="text-xs text-muted-foreground truncate">{alert.message}</div>
                                    </div>
                                    <span className={alertSeverityClass[alert.severity as keyof typeof alertSeverityClass] || 'badge-info'}>
                                        {alert.severity}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-28 text-muted-foreground text-sm gap-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                                <span>No active alerts</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
