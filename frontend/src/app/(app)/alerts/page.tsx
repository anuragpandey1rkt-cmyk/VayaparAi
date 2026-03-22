'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Filter, ShieldAlert, RefreshCw } from 'lucide-react'
import { alertsApi } from '@/lib/api'
import { toast } from 'sonner'

const SEVERITY_FILTERS = ['all', 'critical', 'warning', 'info']
const TYPE_ICONS: Record<string, string> = {
    duplicate_invoice: '📋',
    overcharge: '💸',
    gst_mismatch: '🔴',
    high_contract_risk: '⚠️',
    cashflow_warning: '📉',
    payment_overdue: '⏰',
    unusual_transaction: '🔍',
    system: '🔧',
}

export default function AlertsPage() {
    const [severity, setSeverity] = useState('all')
    const [showResolved, setShowResolved] = useState(false)
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['alerts', severity, showResolved],
        queryFn: () =>
            alertsApi
                .list({
                    severity: severity === 'all' ? undefined : severity,
                    is_resolved: showResolved,
                })
                .then((r) => r.data),
        refetchInterval: 30000,
    })

    const handleResolve = async (alertId: string) => {
        try {
            await alertsApi.resolve(alertId)
            toast.success('Alert resolved')
            queryClient.invalidateQueries({ queryKey: ['alerts'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
        } catch {
            toast.error('Failed to resolve alert')
        }
    }

    const alerts = data?.items || []
    const total = data?.total || 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Alerts Center</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">{total} alerts matching current filters</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowResolved(!showResolved)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showResolved ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground'
                            }`}
                    >
                        {showResolved ? 'Showing Resolved' : 'Show Resolved'}
                    </button>
                </div>
            </div>

            {/* Severity Filter */}
            <div className="flex gap-2">
                {SEVERITY_FILTERS.map((s) => (
                    <button
                        key={s}
                        onClick={() => setSeverity(s)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${severity === s
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
                {isLoading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="glass-card p-5 border border-border">
                            <div className="flex items-start gap-4">
                                <div className="skeleton w-10 h-10 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton h-5 w-64" />
                                    <div className="skeleton h-4 w-full" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : alerts.length === 0 ? (
                    <div className="glass-card border border-border p-16 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
                        <h3 className="font-semibold mb-1">No alerts</h3>
                        <p className="text-muted-foreground text-sm">
                            {showResolved ? 'No resolved alerts found' : 'Your business looks healthy! 🎉'}
                        </p>
                    </div>
                ) : (
                    alerts.map((alert: any) => (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`glass-card p-5 border transition-all ${alert.severity === 'critical'
                                    ? 'border-red-500/30 bg-red-500/5'
                                    : alert.severity === 'warning'
                                        ? 'border-amber-500/20 bg-amber-500/3'
                                        : 'border-border'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${alert.severity === 'critical'
                                        ? 'bg-red-500/15'
                                        : alert.severity === 'warning'
                                            ? 'bg-amber-500/15'
                                            : 'bg-blue-500/15'
                                    }`}>
                                    {TYPE_ICONS[alert.type] || '⚠️'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-1">
                                        <h4 className="font-semibold text-sm">{alert.title}</h4>
                                        <span className={
                                            alert.severity === 'critical' ? 'badge-critical' :
                                                alert.severity === 'warning' ? 'badge-warning' : 'badge-info'
                                        }>
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{alert.message}</p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(alert.created_at).toLocaleString('en-IN')}
                                        </span>
                                        {!alert.is_resolved && (
                                            <button
                                                onClick={() => handleResolve(alert.id)}
                                                className="text-xs text-primary hover:underline font-medium"
                                            >
                                                Mark Resolved ✓
                                            </button>
                                        )}
                                        {alert.is_resolved && (
                                            <span className="badge-success flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Resolved
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}
