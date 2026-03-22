'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, X, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { documentsApi } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

type DocType = 'invoice' | 'contract' | 'bank_statement' | 'other'

const DOC_TYPES = [
    { value: 'invoice', label: '🧾 Invoice / Bill' },
    { value: 'contract', label: '📋 Contract / Agreement' },
    { value: 'bank_statement', label: '🏦 Bank Statement' },
    { value: 'other', label: '📄 Other Document' },
]

const STATUS_ICONS = {
    pending: <Clock className="w-4 h-4 text-amber-400" />,
    processing: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    failed: <AlertCircle className="w-4 h-4 text-red-400" />,
}

const STATUS_LABELS = {
    pending: 'Queued',
    processing: 'AI Processing...',
    completed: 'Complete',
    failed: 'Failed',
}

export default function UploadPage() {
    const [docType, setDocType] = useState<DocType>('invoice')
    const [uploadingFiles, setUploadingFiles] = useState<Map<string, string>>(new Map())
    const queryClient = useQueryClient()

    const { data: documents, isLoading } = useQuery({
        queryKey: ['documents'],
        queryFn: () => documentsApi.list({ per_page: 30 }).then((r) => r.data.items),
        refetchInterval: 5000, // Poll every 5s for processing updates
    })

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            for (const file of acceptedFiles) {
                const tempId = `upload-${Date.now()}-${file.name}`
                setUploadingFiles((prev) => new Map(prev).set(tempId, 'uploading'))

                const formData = new FormData()
                formData.append('file', file)
                formData.append('doc_type', docType)

                try {
                    await documentsApi.upload(formData)
                    toast.success(`"${file.name}" uploaded! AI processing started...`, {
                        description: 'You will be notified when complete.',
                    })
                    queryClient.invalidateQueries({ queryKey: ['documents'] })
                    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
                } catch {
                    toast.error(`Upload failed: ${file.name}`)
                } finally {
                    setUploadingFiles((prev) => {
                        const next = new Map(prev)
                        next.delete(tempId)
                        return next
                    })
                }
            }
        },
        [docType, queryClient]
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/tiff': ['.tif', '.tiff'],
        },
        maxSize: 50 * 1024 * 1024,
    })

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Upload Documents</h2>
                <p className="text-muted-foreground text-sm mt-1">
                    Upload invoices, contracts, or bank statements for AI analysis
                </p>
            </div>

            {/* Doc type selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DOC_TYPES.map((t) => (
                    <button
                        key={t.value}
                        onClick={() => setDocType(t.value as DocType)}
                        className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${docType === t.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${isDragActive
                        ? 'border-primary bg-primary/5 scale-[1.01]'
                        : 'border-border hover:border-primary/50 hover:bg-primary/2 bg-card'
                    }`}
            >
                <input {...getInputProps()} />
                <motion.div
                    animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                >
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                        {isDragActive ? 'Drop files here!' : 'Drag & drop files here'}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        or click to browse · PDF, PNG, JPG, TIFF · Max 50MB
                    </p>
                    <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium">
                        <Upload className="w-4 h-4" />
                        Select Files
                    </div>
                </motion.div>
            </div>

            {/* AI Processing Steps */}
            <div className="glass-card p-5 border border-border">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">AI Processing Pipeline</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {[
                        'S3 Upload', 'OCR Extraction', 'NLP Structuring',
                        'Fraud Check', 'Embeddings', 'pgvector Index',
                    ].map((step, i) => (
                        <div key={step} className="text-center">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-1">
                                <span className="text-xs font-bold text-primary">{i + 1}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">{step}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Documents List */}
            <div className="glass-card border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">Recent Documents</h3>
                    <span className="text-xs text-muted-foreground">{documents?.length || 0} documents</span>
                </div>
                <div className="divide-y divide-border">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4">
                                <div className="skeleton w-9 h-9 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton h-4 w-48" />
                                    <div className="skeleton h-3 w-24" />
                                </div>
                                <div className="skeleton h-5 w-20 rounded-full" />
                            </div>
                        ))
                    ) : documents?.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            No documents yet. Upload your first document above.
                        </div>
                    ) : (
                        documents?.map((doc: any) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <File className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{doc.filename}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {doc.doc_type} · {(doc.file_size / 1024).toFixed(1)} KB ·{' '}
                                        {new Date(doc.created_at).toLocaleDateString('en-IN')}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {STATUS_ICONS[doc.status as keyof typeof STATUS_ICONS]}
                                    <span className="text-xs text-muted-foreground">
                                        {STATUS_LABELS[doc.status as keyof typeof STATUS_LABELS]}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
