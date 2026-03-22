'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, AlertTriangle, CheckCircle2, Filter } from 'lucide-react'
import { invoicesApi } from '@/lib/api'

const STATUS_FILTERS = ['all', 'paid', 'unpaid', 'overdue']

export default function InvoicesPage() {
    const [status, setStatus] = useState('all')
    const [page, setPage] = useState(1)

    const { data: stats } = useQuery({
        queryKey: ['invoice-stats'],
        queryFn: () => invoicesApi.stats().then((r) => r.data),
    })

    const { data, isLoading } = useQuery({
        queryKey: ['invoices', status, page],
        queryFn: () =>
            invoicesApi.list({ status: status === 'all' ? undefined : status, page, per_page: 20 }).then((r) => r.data),
    })

    const invoices = data?.items || []

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Invoices</h2>
                <p className="text-muted-foreground text-sm mt-0.5">All extracted invoice data with fraud analysis</p>
            </div>

            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card p-4 border border-border">
                        <div className="text-2xl font-bold">₹{(stats.total_amount / 100000).toFixed(1)}L</div>
                        <div className="text-sm text-muted-foreground">Total Invoice Value</div>
                    </div>
                    <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5">
                        <div className="text-2xl font-bold text-amber-400">₹{(stats.unpaid_amount / 100000).toFixed(1)}L</div>
                        <div className="text-sm text-muted-foreground">Outstanding ({stats.unpaid_count})</div>
                    </div>
                    <div className="glass-card p-4 border border-red-500/20 bg-red-500/5">
                        <div className="text-2xl font-bold text-red-400">{stats.duplicates + stats.gst_mismatches}</div>
                        <div className="text-sm text-muted-foreground">Fraud Flags</div>
                    </div>
                    <div className="glass-card p-4 border border-purple-500/20 bg-purple-500/5">
                        <div className="text-2xl font-bold text-purple-400">{stats.unique_vendors}</div>
                        <div className="text-sm text-muted-foreground">Unique Vendors</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2">
                {STATUS_FILTERS.map((s) => (
                    <button
                        key={s}
                        onClick={() => { setStatus(s); setPage(1) }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${status === s ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Invoices Table */}
            <div className="glass-card border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk</th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fraud</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(7)].map((_, j) => (
                                            <td key={j} className="px-5 py-3.5">
                                                <div className="skeleton h-4 w-full rounded" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                        No invoices found. Upload invoice PDFs to get started.
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv: any) => (
                                    <motion.tr
                                        key={inv.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="px-5 py-3.5 font-mono text-xs">{inv.invoice_number || '—'}</td>
                                        <td className="px-5 py-3.5 max-w-[140px] truncate">{inv.vendor_name || '—'}</td>
                                        <td className="px-5 py-3.5 text-muted-foreground">
                                            {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-medium">
                                            ₹{Number(inv.total_amount || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className={
                                                inv.status === 'paid' ? 'badge-success' :
                                                    inv.status === 'overdue' ? 'badge-critical' : 'badge-warning'
                                            }>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <div className="flex items-center justify-center">
                                                <div
                                                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${inv.fraud_score >= 70 ? 'text-red-400 bg-red-500/15' :
                                                            inv.fraud_score >= 40 ? 'text-amber-400 bg-amber-500/15' :
                                                                'text-emerald-400 bg-emerald-500/15'
                                                        }`}
                                                >
                                                    {Math.round(inv.fraud_score)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {(inv.is_duplicate || inv.is_overcharge || inv.gst_mismatch) ? (
                                                <AlertTriangle className="w-4 h-4 text-red-400 mx-auto" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {data && data.pages > 1 && (
                    <div className="border-t border-border px-5 py-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Page {page} of {data.pages} ({data.total} total)</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-accent transition-colors">
                                Previous
                            </button>
                            <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                                className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-accent transition-colors">
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
