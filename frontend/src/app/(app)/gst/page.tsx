'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Receipt, Info, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react'
import { gstApi } from '@/lib/api'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'

export default function GSTPage() {
    const [days, setDays] = useState(30)

    const { data, isLoading } = useQuery({
        queryKey: ['gst-summary', days],
        queryFn: () => gstApi.summary(days).then((r) => r.data),
    })

    const chartData = [
        { name: 'Liability (Sales)', amount: data?.liability?.total || 0, fill: 'hsl(var(--primary))' },
        { name: 'ITC (Purchases)', amount: data?.itc?.total || 0, fill: 'hsl(142 76% 36%)' },
    ]

    const netPayable = data?.net_gst_payable || 0
    const isSurplus = netPayable < 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">GST Insights</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">Real-time GST Liability vs Input Tax Credit (ITC)</p>
                </div>
                <div className="flex gap-1 bg-card border border-border p-1 rounded-lg">
                    {[30, 90, 365].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${days === d ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {d === 365 ? '1 Year' : `${d} Days`}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-card rounded-xl border border-border" />)}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-5 border border-border/50 relative overflow-hidden"
                        >
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Liability</div>
                            <div className="text-3xl font-bold">₹{data?.liability?.total?.toLocaleString('en-IN')}</div>
                            <div className="flex items-center gap-1.5 text-xs text-primary mt-2">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>Based on sales invoices</span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-card p-5 border border-border/50 relative overflow-hidden"
                        >
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Input Tax Credit (ITC)</div>
                            <div className="text-3xl font-bold text-emerald-500">₹{data?.itc?.total?.toLocaleString('en-IN')}</div>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-500/80 mt-2">
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>Reduces your tax burden</span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={`glass-card p-5 border border-border/50 relative overflow-hidden ${isSurplus ? 'bg-emerald-500/5' : 'bg-primary/5'}`}
                        >
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Net GST {isSurplus ? 'Surplus' : 'Payable'}</div>
                            <div className={`text-3xl font-bold ${isSurplus ? 'text-emerald-400' : 'text-primary'}`}>
                                ₹{Math.abs(netPayable).toLocaleString('en-IN')}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs opacity-80 mt-2">
                                <Info className="w-3.5 h-3.5" />
                                <span>Estimated net position</span>
                            </div>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 border border-border border-l-primary border-l-4">
                            <h3 className="font-semibold mb-6 flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-primary" />
                                Tax Comparison
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null
                                                return (
                                                    <div className="bg-popover border border-border p-2 rounded shadow-xl text-xs">
                                                        ₹{Number(payload[0].value).toLocaleString('en-IN')}
                                                    </div>
                                                )
                                            }}
                                        />
                                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={32}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 p-4 rounded-lg bg-card border border-border">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-sm font-medium">Filing Tip</div>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            Ensure all your purchase invoices are digitized correctly to maximize your Input Tax Credit (ITC) before the next GSTR-1 deadline.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 border border-border">
                            <h3 className="font-semibold mb-6">Component Breakdown</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-xs font-medium text-muted-foreground mb-3 uppercase tracking-widest">
                                        <span>Type</span>
                                        <span>Liability (Sales)</span>
                                        <span>ITC (Purchases)</span>
                                    </div>
                                    <div className="divide-y divide-border/40">
                                        <div className="py-3 flex justify-between items-center group">
                                            <span className="text-sm">CGST</span>
                                            <div className="flex gap-8 text-right font-mono text-sm">
                                                <span className="w-24">₹{data?.liability?.cgst?.toLocaleString('en-IN')}</span>
                                                <span className="w-24 text-emerald-500">₹{data?.itc?.cgst?.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                        <div className="py-3 flex justify-between items-center">
                                            <span className="text-sm">SGST</span>
                                            <div className="flex gap-8 text-right font-mono text-sm">
                                                <span className="w-24">₹{data?.liability?.sgst?.toLocaleString('en-IN')}</span>
                                                <span className="w-24 text-emerald-500">₹{data?.itc?.sgst?.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                        <div className="py-3 flex justify-between items-center">
                                            <span className="text-sm">IGST</span>
                                            <div className="flex gap-8 text-right font-mono text-sm">
                                                <span className="w-24">₹{data?.liability?.igst?.toLocaleString('en-IN')}</span>
                                                <span className="w-24 text-emerald-500">₹{data?.itc?.igst?.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
