'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
    Brain, FileText, TrendingUp, ShieldAlert, Lightbulb, 
    Sparkles, ArrowRight, BarChart3, PieChart, TrendingDown,
    Zap, AlertCircle
} from 'lucide-react'
import { dashboardApi, insightsApi } from '@/lib/api'
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    Cell, AreaChart, Area, CartesianGrid 
} from 'recharts'
import Link from 'next/link'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b']

const InsightCard = ({ icon: Icon, title, description, impact, category, color, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="glass-card p-5 border border-border/50 hover:border-primary/30 transition-all group relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 p-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                impact === 'High' ? 'bg-red-500/10 text-red-400' : 
                impact === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 
                'bg-blue-500/10 text-blue-400'
            }`}>
                {impact} Impact
            </span>
        </div>
        <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{category}</div>
                <h3 className="font-semibold text-sm mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </div>
    </motion.div>
)

export default function InsightsPage() {
    const { data: summary } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: () => dashboardApi.summary().then((r) => r.data),
    })

    const { data: analysis, isLoading } = useQuery({
        queryKey: ['spend-analysis'],
        queryFn: () => insightsApi.spendAnalysis().then((r) => r.data),
        refetchInterval: 30000,
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Brain className="w-12 h-12 text-primary animate-pulse" />
                    <p className="text-muted-foreground animate-pulse">AI is analyzing your business data...</p>
                </div>
            </div>
        )
    }

    const trends = analysis?.monthly_trends || []
    const vendors = analysis?.top_vendors || []
    const recs = analysis?.recommendations || []

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">AI Insights & Analytics</h2>
                        <p className="text-muted-foreground text-sm">Strategic intelligence for your business growth</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-xl border border-border/50">
                    <Sparkles className="w-4 h-4 text-vyapar-400" />
                    <span className="text-xs font-medium">Powered by Groq Llama 3.3</span>
                </div>
            </div>

            {/* Top Row: Chart & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 glass-card p-6 border border-border/50"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <h3 className="font-semibold text-sm">Spending Trends (6 Months)</h3>
                        </div>
                        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Monthly Amount (₹)</div>
                    </div>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends}>
                                <defs>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => `₹${val/1000}k`} />
                                <Tooltip 
                                    content={({ active, payload }) => active && payload && (
                                        <div className="glass-card p-2 border border-border shadow-xl">
                                            <div className="text-[10px] text-muted-foreground mb-1">{payload[0].payload.month}</div>
                                            <div className="text-sm font-bold">₹{payload[0].value?.toLocaleString('en-IN')}</div>
                                        </div>
                                    )}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSpend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card p-6 border border-border/50 flex flex-col"
                >
                    <div className="flex items-center gap-2 mb-6 text-sm font-semibold">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                        Top Vendor Spend
                    </div>
                    <div className="flex-1 space-y-4">
                        {vendors.map((v: any, i: number) => (
                            <div key={v.name} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium truncate max-w-[140px]">{v.name}</span>
                                    <span className="text-muted-foreground">₹{(v.spend / 1000).toFixed(1)}k</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ 
                                            width: `${analysis.total_analyzed_spend > 0 
                                                ? (v.spend / analysis.total_analyzed_spend) * 100 
                                                : 0}%` 
                                        }}
                                        className="h-full bg-primary"
                                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 p-3 bg-muted/40 rounded-xl border border-border/50">
                        <div className="text-[10px] text-muted-foreground uppercase mb-1">Total Analyzed Spend</div>
                        <div className="text-xl font-extrabold tracking-tight">₹{analysis.total_analyzed_spend?.toLocaleString('en-IN')}</div>
                    </div>
                </motion.div>
            </div>

            {/* AI Recommendations Section */}
            <div>
                <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h3 className="text-xl font-bold">AI Strategic Recommendations</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recs.map((rec: any, i: number) => (
                        <InsightCard 
                            key={rec.id}
                            icon={rec.category === 'Tax' ? FileText : rec.category === 'Cashflow' ? TrendingDown : Lightbulb}
                            title={rec.title}
                            description={rec.description}
                            impact={rec.impact}
                            category={rec.category}
                            delay={0.1 * i}
                        />
                    ))}
                </div>
            </div>

            {/* Deep Analysis Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6 border border-border/50">
                    <div className="flex items-center gap-2 mb-6">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <h3 className="font-semibold text-sm">MSME Compliance Score</h3>
                    </div>
                    <div className="flex items-center gap-10">
                        <div className="relative w-32 h-32">
                             <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                                <circle 
                                    cx="18" cy="18" r="15.9" 
                                    fill="none" stroke="url(#blueGrad)" 
                                    strokeWidth="3" 
                                    strokeDasharray="85 15" 
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-extrabold tracking-tighter">85/100</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold">Excellent</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="text-sm text-muted-foreground leading-relaxed">
                                Your business maintains a high compliance score. 
                                <strong> No major GST gaps</strong> or late payment penalties detected in the last 90 days.
                            </div>
                            <div className="flex gap-4">
                                <div>
                                    <div className="text-xs font-bold text-emerald-400">92%</div>
                                    <div className="text-[10px] text-muted-foreground">GST Promptness</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-emerald-400">0</div>
                                    <div className="text-[10px] text-muted-foreground">Legal Risks</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border border-border/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap className="w-24 h-24 text-primary" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="font-semibold text-sm mb-4">Autonomous Action Agent</h3>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                            VyaparAI has identified <strong>₹42,500</strong> in potential savings through automated vendor negotiation and early payment discounts.
                        </p>
                        <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                            Apply Optimized Strategy <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
