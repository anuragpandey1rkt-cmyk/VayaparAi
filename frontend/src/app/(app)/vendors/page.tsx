'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Store, AlertTriangle, IndianRupee, BarChart3 } from 'lucide-react'
import { vendorsApi } from '@/lib/api'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export default function VendorsPage() {
    const { data: heatmap, isLoading: heatmapLoading } = useQuery({
        queryKey: ['vendors-heatmap'],
        queryFn: () => vendorsApi.heatmap().then((r) => r.data),
    })
    const { data: analytics } = useQuery({
        queryKey: ['vendors-analytics'],
        queryFn: () => vendorsApi.analytics().then((r) => r.data),
    })

    const vendors = heatmap?.vendors || []
    const topVendors = analytics?.top_vendors || []

    const getRiskColor = (score: number) => {
        if (score >= 70) return 'hsl(0 84% 60%)'
        if (score >= 40) return 'hsl(45 93% 60%)'
        return 'hsl(142 76% 36%)'
    }

    const getRiskBg = (score: number) => {
        if (score >= 70) return 'bg-red-500/10 border-red-500/30'
        if (score >= 40) return 'bg-amber-500/10 border-amber-500/30'
        return 'bg-emerald-500/10 border-emerald-500/30'
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Vendor Analytics</h2>
                <p className="text-muted-foreground text-sm mt-0.5">Risk scores, spend analysis, and fraud flags</p>
            </div>

            {/* Risk Heatmap Grid */}
            <div className="glass-card border border-border p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Vendor Risk Heatmap
                </h3>
                {heatmapLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
                    </div>
                ) : vendors.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        Upload invoices to see vendor risk analysis
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {vendors.map((v: any) => (
                            <motion.div
                                key={v.name}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.02 }}
                                className={`p-4 rounded-xl border ${getRiskBg(v.risk_score)} ${v.is_flagged ? 'ring-2 ring-red-500/30' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                                    {v.is_flagged && (
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                    )}
                                </div>
                                <div className="text-sm font-medium truncate" title={v.name}>{v.name}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{v.invoice_count} invoices</div>
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="text-xs font-medium">
                                        ₹{(v.total_spend / 100000).toFixed(1)}L
                                    </div>
                                    <div
                                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                                        style={{ color: getRiskColor(v.risk_score), background: `${getRiskColor(v.risk_score)}20` }}
                                    >
                                        {Math.round(v.risk_score)}
                                    </div>
                                </div>
                                {/* Risk progress bar */}
                                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${v.risk_score}%`,
                                            background: getRiskColor(v.risk_score),
                                        }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Top Vendors Bar Chart */}
            {topVendors.length > 0 && (
                <div className="glass-card border border-border p-6">
                    <h3 className="font-semibold mb-6 flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-emerald-400" />
                        Top 10 Vendors by Spend
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={topVendors} layout="vertical" margin={{ left: 0, right: 30 }}>
                            <XAxis
                                type="number"
                                tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                                width={120}
                            />
                            <Tooltip
                                content={({ active, payload }) =>
                                    active && payload?.length ? (
                                        <div className="glass-card p-3 border border-border text-sm">
                                            <div className="font-medium">{payload[0].payload.name}</div>
                                            <div>Spend: ₹{Number(payload[0].value).toLocaleString('en-IN')}</div>
                                            <div>Risk: {Math.round(payload[0].payload.risk_score)}/100</div>
                                        </div>
                                    ) : null
                                }
                            />
                            <Bar dataKey="total_spend" radius={[0, 6, 6, 0]}>
                                {topVendors.map((v: any, i: number) => (
                                    <Cell key={i} fill={getRiskColor(v.risk_score)} opacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}
