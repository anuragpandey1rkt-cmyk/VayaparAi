'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, IndianRupee, RefreshCw } from 'lucide-react'
import { cashflowApi } from '@/lib/api'
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
    ResponsiveContainer, ReferenceLine,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="glass-card p-3 border border-border text-sm shadow-lg">
            <div className="font-medium mb-1">{label}</div>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span style={{ color: p.color }}>●</span>
                    <span className="text-muted-foreground capitalize">{p.name}:</span>
                    <span className="font-medium">₹{Number(p.value).toLocaleString('en-IN')}</span>
                </div>
            ))}
        </div>
    )
}

export default function CashflowPage() {
    const [horizon, setHorizon] = useState(30)

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['cashflow-forecast', horizon],
        queryFn: () => cashflowApi.forecast(horizon).then((r) => r.data),
    })

    const dailyData = data?.daily_forecast || []
    const isPositive = (data?.predicted_balance || 0) >= 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Cashflow Forecast</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">AI-powered prediction based on your real financial data</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        {[30, 60, 90].map((h) => (
                            <button
                                key={h}
                                onClick={() => setHorizon(h)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${horizon === h ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {h}d
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`glass-card p-5 border ${isPositive ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                    <div className="text-sm text-muted-foreground mb-1">Predicted Balance ({horizon}d)</div>
                    <div className={`text-3xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₹{((data?.predicted_balance || 0) / 100000).toFixed(2)}L
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        {isPositive ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                        {isPositive ? 'Healthy' : 'Cash crunch warning'}
                    </div>
                </div>
                <div className="glass-card p-5 border border-emerald-500/20 bg-emerald-500/5">
                    <div className="text-sm text-muted-foreground mb-1">Expected Receivables</div>
                    <div className="text-3xl font-bold text-emerald-400">
                        ₹{((data?.expected_receivables || 0) / 100000).toFixed(2)}L
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">From unpaid invoices due</div>
                </div>
                <div className="glass-card p-5 border border-red-500/20 bg-red-500/5">
                    <div className="text-sm text-muted-foreground mb-1">Expected Outflows</div>
                    <div className="text-3xl font-bold text-red-400">
                        ₹{((data?.expected_payables || 0) / 100000).toFixed(2)}L
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Based on historical avg</div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="glass-card p-6 border border-border">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold">{horizon}-Day Cashflow Projection</h3>
                    {data?.confidence_score && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
                            {Math.round((data.confidence_score || 0.75) * 100)}% confidence
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-72">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(238 75% 60%)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="hsl(238 75% 60%)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={0} stroke="hsl(0 84% 60%)" strokeDasharray="4 4" opacity={0.5} />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="hsl(238 75% 60%)"
                                strokeWidth={2}
                                fill="url(#balGrad)"
                                name="Balance"
                            />
                            <Area
                                type="monotone"
                                dataKey="receivables"
                                stroke="hsl(142 76% 36%)"
                                strokeWidth={1.5}
                                fill="url(#recGrad)"
                                name="Receivables"
                                strokeDasharray="5 3"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-72 text-muted-foreground text-sm gap-3">
                        <IndianRupee className="w-12 h-12 opacity-20" />
                        <p>Upload invoices and bank statements to generate cashflow forecasts</p>
                    </div>
                )}
            </div>
        </div>
    )
}
