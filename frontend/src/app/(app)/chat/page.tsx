'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User as UserIcon, Brain, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { chatApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    sources?: any[]
    timestamp: Date
    rating?: number
}

const SUGGESTED_QUESTIONS = [
    'What is my current cashflow situation?',
    'Are there any duplicate invoices I should know about?',
    'Which vendor poses the highest risk?',
    'Summarize my outstanding receivables',
    'What are the key risks in my contracts?',
]

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Namaste! 🙏 I\'m **VyaparAI**, your AI Business Co-Pilot. I have full visibility into your invoices, contracts, bank transactions, and cashflow. Ask me anything about your business!',
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [sessionId] = useState(() => crypto.randomUUID())
    const bottomRef = useRef<HTMLDivElement>(null)
    const { user } = useAuthStore()

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async (question: string) => {
        if (!question.trim() || loading) return

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: question,
            timestamp: new Date(),
        }
        setMessages((prev) => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            const { data } = await chatApi.sendMessage({ question, session_id: sessionId })
            const aiMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: data.answer,
                sources: data.sources,
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, aiMsg])
        } catch {
            setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
            toast.error('Chat failed. Please check your AI provider API key configuration.')
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    return (
        <div className="flex flex-col h-full -m-6">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center shadow-md">
                        <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold">AI Business Co-Pilot</h2>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className="status-dot-green" />
                            RAG-powered · Grounded in your business data
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'assistant'
                                    ? 'bg-gradient-to-br from-vyapar-500 to-purple-600'
                                    : 'bg-muted border border-border'
                                }`}>
                                {msg.role === 'assistant'
                                    ? <Brain className="w-4 h-4 text-white" />
                                    : <UserIcon className="w-4 h-4 text-muted-foreground" />
                                }
                            </div>
                            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-tr-md'
                                        : 'bg-card border border-border rounded-tl-md'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    )}
                                </div>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {msg.sources.slice(0, 2).map((s, i) => (
                                            <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                                📄 Source {i + 1}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="text-[10px] text-muted-foreground">
                                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center shrink-0">
                            <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div className="px-4 py-3 bg-card border border-border rounded-2xl rounded-tl-md">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Searching your business data...
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length <= 1 && (
                <div className="px-6 pb-2">
                    <div className="flex gap-2 flex-wrap">
                        {SUGGESTED_QUESTIONS.map((q) => (
                            <button
                                key={q}
                                onClick={() => sendMessage(q)}
                                className="text-xs bg-muted hover:bg-accent border border-border px-3 py-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="px-6 py-4 border-t border-border bg-card/50 backdrop-blur-sm shrink-0">
                <div className="flex gap-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your invoices, cashflow, contracts, vendors..."
                        rows={1}
                        className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors leading-relaxed"
                    />
                    <button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || loading}
                        className="w-11 h-11 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Answers are grounded in your actual business documents using RAG technology
                </p>
            </div>
        </div>
    )
}
