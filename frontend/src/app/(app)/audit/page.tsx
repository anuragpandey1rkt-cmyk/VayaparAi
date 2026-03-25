'use client'

import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/lib/api'
import { 
    History, 
    User, 
    Calendar, 
    Activity, 
    FileText, 
    ShieldAlert,
    ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'

export default function AuditPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: () => auditApi.list().then(res => res.data),
    })

    const getActionIcon = (action: string) => {
        if (action.includes('error') || action.includes('fail')) return <ShieldAlert className="w-4 h-4 text-destructive" />
        if (action.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />
        if (action.includes('auth') || action.includes('login')) return <User className="w-4 h-4 text-purple-500" />
        return <Activity className="w-4 h-4 text-vyapar-500" />
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <History className="w-6 h-6 text-primary" />
                        Activity Log
                    </h1>
                    <p className="text-muted-foreground">Monitor system events and user actions across your business.</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-4 py-3">Event</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Resource</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading activity logs...</td>
                                    </tr>
                                ))
                            ) : data?.items?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                        No activity logs found.
                                    </td>
                                </tr>
                            ) : (
                                data?.items?.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 font-medium">
                                                {getActionIcon(log.action)}
                                                <span className="capitalize">{log.action.replace(/\./g, ' ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                                                    {log.user_name.charAt(0)}
                                                </div>
                                                {log.user_name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-muted-foreground">
                                            {log.resource_type ? (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted w-fit text-xs border border-border">
                                                    {log.resource_type}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-4 max-w-xs truncate" title={log.description}>
                                            {log.description || 'No additional details.'}
                                        </td>
                                        <td className="px-4 py-4 text-muted-foreground font-mono text-[11px]">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
