'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock,
    FileText, Calendar, IndianRupee, Info,
} from 'lucide-react'
import { contractsApi } from '@/lib/api'
import { useState } from 'react'

const RISK_FILTERS = ['all', 'critical', 'high', 'medium', 'low']

function RiskBadge({ level }: { level: string }) {
    const styles: Record<string, string> = {
        critical: 'badge-critical',
        high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30 text-xs font-medium px-2.5 py-0.5 rounded-full',
        medium: 'badge-warning',
        low: 'badge-success',
    }
    return <span className={styles[level] || 'badge-info'}>{level}</span>
}

function RiskMeter({ score }: { score: number }) {
    const color = score >= 85 ? 'bg-red-500' : score >= 70 ? 'bg-orange-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
    const textColor = score >= 85 ? 'text-red-400' : score >= 70 ? 'text-orange-400' : score >= 40 ? 'text-amber-400' : 'text-emerald-400'
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Risk Score</span>
                <span className={`font-bold ${textColor}`}>{score}/100</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
            </div>
        </div>
    )
}

export default function ContractsPage() {
    const [riskFilter, setRiskFilter] = useState('all')
    const [selected, setSelected] = useState<any>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['contracts', riskFilter],
        queryFn: () => contractsApi.list({ risk_level: riskFilter === 'all' ? undefined : riskFilter, per_page: 30 }).then((r) => r.data),
    })

    const contracts = data?.items || []

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Contract Risk Analysis</h2>
                <p className="text-muted-foreground text-sm mt-0.5">AI-powered contract review with risk scoring and clause extraction</p>
            </div>

            {/* Risk Filters */}
            <div className="flex gap-2 flex-wrap">
                {RISK_FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setRiskFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${riskFilter === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className={`grid gap-6 ${selected ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Contract List */}
                <div className="space-y-3">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="glass-card border border-border p-5 space-y-3"><div className="skeleton h-5 w-48" /><div className="skeleton h-4 w-full" /><div className="skeleton h-3 w-32" /></div>)
                    ) : contracts.length === 0 ? (
                        <div className="glass-card border border-border p-16 text-center">
                            <ShieldCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="font-semibold mb-1">No contracts yet</h3>
                            <p className="text-muted-foreground text-sm">Upload contract PDFs to get AI risk analysis</p>
                        </div>
                    ) : (
                        contracts.map((contract: any) => (
                            <motion.div
                                key={contract.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setSelected(selected?.id === contract.id ? null : contract)}
                                className={`glass-card p-5 border cursor-pointer transition-all hover:border-primary/40 ${selected?.id === contract.id ? 'border-primary/50 bg-primary/5' : 'border-border'
                                    } ${contract.risk_level === 'critical' ? 'border-red-500/30' : contract.risk_level === 'high' ? 'border-orange-500/30' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm truncate">
                                            {contract.contract_title || 'Untitled Contract'}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{contract.contract_type || 'General'}</p>
                                    </div>
                                    {contract.risk_level && <RiskBadge level={contract.risk_level} />}
                                </div>

                                {contract.risk_score !== null && (
                                    <RiskMeter score={contract.risk_score || 0} />
                                )}

                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    {contract.contract_value && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <IndianRupee className="w-3 h-3" />
                                            ₹{Number(contract.contract_value).toLocaleString('en-IN')}
                                        </div>
                                    )}
                                    {contract.end_date && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            Expires {new Date(contract.end_date).toLocaleDateString('en-IN')}
                                        </div>
                                    )}
                                </div>

                                {contract.risk_summary && (
                                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">
                                        {contract.risk_summary}
                                    </p>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Detail Panel */}
                {selected && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card border border-border p-6 space-y-5 h-fit"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-bold">{selected.contract_title || 'Untitled'}</h3>
                                <p className="text-xs text-muted-foreground capitalize">{selected.contract_type}</p>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
                        </div>

                        {selected.risk_score !== null && <RiskMeter score={selected.risk_score || 0} />}

                        {selected.risk_summary && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Risk Summary</h4>
                                <p className="text-sm leading-relaxed">{selected.risk_summary}</p>
                            </div>
                        )}

                        {selected.key_clauses && selected.key_clauses.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Key Clauses Found
                                </h4>
                                <ul className="space-y-1">
                                    {selected.key_clauses.map((c: string, i: number) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <span className="text-emerald-400 mt-0.5">✓</span> {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {selected.missing_clauses && selected.missing_clauses.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-red-400" /> Missing Clauses
                                </h4>
                                <ul className="space-y-1">
                                    {selected.missing_clauses.map((c: string, i: number) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <span className="text-red-400 mt-0.5">✗</span> {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {selected.recommended_actions && selected.recommended_actions.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <Info className="w-3 h-3 text-blue-400" /> Recommended Actions
                                </h4>
                                <ul className="space-y-1">
                                    {selected.recommended_actions.map((a: string, i: number) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <span className="text-blue-400 mt-0.5">{i + 1}.</span> {a}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                            {selected.jurisdiction && <div><div className="text-xs text-muted-foreground">Jurisdiction</div><div className="text-sm font-medium">{selected.jurisdiction}</div></div>}
                            {selected.parties && <div><div className="text-xs text-muted-foreground">Parties</div><div className="text-sm font-medium">{Array.isArray(selected.parties) ? selected.parties.join(', ') : 'N/A'}</div></div>}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
