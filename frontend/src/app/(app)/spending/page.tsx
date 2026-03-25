'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
    PieChart as PieIcon, 
    TrendingUp, 
    Users, 
    ArrowUpRight, 
    ArrowDownRight,
    Filter,
    Download,
    ShoppingBag,
    Zap
} from 'lucide-react'
import { spendingApi } from '@/lib/api'
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'

const COLORS = [
    'hsl(var(--primary))',
    'hsl(142 76% 36%)',
    'hsl(217 91% 60%)',
    'hsl(31 97% 55%)',
    'hsl(280 65% 60%)',
    'hsl(0 84% 60%)',
    'hsl(199 89% 48%)',
]

export default function SpendingPage() {
    const [days, setDays] = useState(30)

    const { data, isLoading } = useQuery({
        queryKey: ['spending-summary', days],
        queryFn: () => spendingApi.summary(days).then((r) => r.data),
    })

    const categories = data?.categories || []
    const topVendors = data?.top_vendors || []
    const monthlyTrend = data?.monthly_trend || []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-primary" />
                        Spending Analytics
                    </h2>
                    <p className="text-muted-foreground text-sm mt-0.5">Track your expenses and optimize procurement</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-card border border-border p-1 rounded-lg">
                        {[30, 90, 365].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    days === d 
                                    ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {d === 365 ? '1 Year' : `${d} Days`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
                    <div className="h-[400px] bg-card rounded-xl border border-border" />
                    <div className="h-[400px] bg-card rounded-xl border border-border" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Summary Metrics */}
                        <div className="lg:col-span-1 space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-card p-6 border border-primary/20 bg-primary/5 shadow-lg shadow-primary/5"
                            >
                                <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">Total Spending</div>
                                <div className="text-4xl font-bold tracking-tight">₹{data?.total_spend?.toLocaleString('en-IN')}</div>
                                <div className="flex items-center gap-2 text-xs text-primary mt-3 font-semibold">
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Analysis for last {days} days</span>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="glass-card p-6 border border-border"
                            >
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                    <PieIcon className="w-4 h-4 text-primary" />
                                    Top Categories
                                </h3>
                                <div className="space-y-4">
                                    {categories.slice(0, 4).map((cat: any, i: number) => (
                                        <div key={i} className="group cursor-default">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{cat.category}</span>
                                                <span className="text-xs font-mono font-bold">₹{cat.amount.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(cat.amount / data.total_spend) * 100}%` }}
                                                    className="h-full bg-primary rounded-full group-hover:brightness-110 transition-all"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Donut Chart */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="lg:col-span-2 glass-card p-6 border border-border min-h-[400px]"
                        >
                            <h3 className="font-bold mb-6">Spending Breakdown</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categories}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={5}
                                            dataKey="amount"
                                            nameKey="category"
                                        >
                                            {categories.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            contentStyle={{ 
                                                backgroundColor: 'hsl(var(--popover))', 
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: '8px',
                                                fontSize: '12px'
                                            }}
                                            formatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-4">
                                {categories.map((cat: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">{cat.category}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Vendors */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card border border-border overflow-hidden"
                        >
                            <div className="p-6 border-b border-border flex items-center justify-between">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" />
                                    Top Vendors
                                </h3>
                            </div>
                            <div className="divide-y divide-border">
                                {topVendors.map((vendor: any, i: number) => (
                                    <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {vendor.vendor_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold">{vendor.vendor_name}</div>
                                                <div className="text-xs text-muted-foreground">{vendor.count} Invoices</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold">₹{vendor.amount.toLocaleString('en-IN')}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Spent</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Recent Insights Plugin (Placeholder for future hook) */}
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-6 rounded-xl border border-primary/30 bg-primary/5 flex gap-4"
                            >
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <Zap className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wider text-primary/80 mb-1">AI Procurement Tip</div>
                                    <h4 className="font-bold text-foreground mb-1">Optimize Bulk Purchases</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        You've made 8 minor purchases from <span className="text-primary font-semibold">{topVendors[0]?.vendor_name}</span> recently. 
                                        Combining these into a quarterly bulk order could save you up to 12% in logistics and processing costs.
                                    </p>
                                </div>
                            </motion.div>

                            <div className="glass-card p-6 border border-border border-l-primary border-l-4">
                                <h3 className="font-bold mb-4">Quarterly Trend</h3>
                                <div className="h-48 w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={monthlyTrend}>
                                            <defs>
                                                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area 
                                                type="monotone" 
                                                dataKey="amount" 
                                                stroke="hsl(var(--primary))" 
                                                strokeWidth={3}
                                                fillOpacity={1} 
                                                fill="url(#spendGrad)" 
                                            />
                                            <XAxis dataKey="month" hide />
                                            <YAxis hide />
                                            <RechartsTooltip 
                                                formatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
