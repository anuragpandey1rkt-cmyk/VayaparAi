'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    Brain,
    FileText,
    Shield,
    TrendingUp,
    MessageSquare,
    Zap,
    ArrowRight,
    ChevronRight,
    Stars,
    IndianRupee,
} from 'lucide-react'

const features = [
    {
        icon: FileText,
        title: 'Smart Invoice OCR',
        description: 'Upload any invoice PDF or image. AI extracts all fields, GST data, and line items automatically.',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
        icon: Shield,
        title: 'Fraud Detection',
        description: 'Automatically detect duplicate invoices, vendor overcharges (>30% deviation), and GST mismatches.',
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/20',
    },
    {
        icon: TrendingUp,
        title: 'Cashflow Forecasting',
        description: '30/60-day cashflow predictions with confidence intervals based on your real invoice and bank data.',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
        icon: Brain,
        title: 'Contract Risk Analysis',
        description: 'Upload any contract. Get AI-scored risk (0-100), clause extraction, and recommended actions.',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
        icon: MessageSquare,
        title: 'RAG Business Chat',
        description: 'Ask any business question. AI retrieves relevant documents and gives grounded, cited answers.',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
        icon: Zap,
        title: 'Real-time Alerts',
        description: 'Instant notifications for fraud, high-risk contracts, overdue payments, and cashflow warnings.',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
]

const pricing = [
    {
        name: 'Starter',
        price: '₹999',
        period: '/month',
        documents: '100 docs/month',
        features: ['Invoice OCR', 'Fraud Detection', 'Basic Chat', 'Email Alerts'],
        cta: 'Start Free Trial',
        highlighted: false,
    },
    {
        name: 'Pro',
        price: '₹2,999',
        period: '/month',
        documents: '500 docs/month',
        features: ['Everything in Starter', 'Cashflow Forecasting', 'Contract Risk AI', 'Priority Support', 'API Access'],
        cta: 'Start Pro Trial',
        highlighted: true,
    },
    {
        name: 'Enterprise',
        price: '₹9,999',
        period: '/month',
        documents: 'Unlimited',
        features: ['Everything in Pro', 'Custom Integrations', 'Dedicated Account Manager', 'SLA Guarantee', 'White-label'],
        cta: 'Contact Sales',
        highlighted: false,
    },
]

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center">
                            <Brain className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">VyaparAI</span>
                        <span className="hidden sm:inline text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">Beta</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
                        <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
                        <a href="#about" className="hover:text-foreground transition-colors">About</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Sign In
                        </Link>
                        <Link
                            href="/auth/register"
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Background glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-1/4 w-96 h-96 bg-vyapar-600/20 rounded-full blur-3xl" />
                    <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
                </div>

                <div className="relative text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 bg-vyapar-500/10 border border-vyapar-500/20 rounded-full px-4 py-1.5 text-sm text-vyapar-400 mb-8"
                    >
                        <Stars className="w-3.5 h-3.5" />
                        India's First AI Business Co-Pilot for MSMEs
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
                    >
                        <span className="gradient-text">Vyapar ko banao</span>
                        <br />
                        <span className="text-foreground">AI ka power plant</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
                    >
                        Upload invoices, contracts, bank statements. Get instant AI insights—fraud detection,
                        cashflow forecasts, contract risk scores, and a business advisor in your pocket.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <Link
                            href="/auth/register"
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
                        >
                            Start Free – No Credit Card
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/auth/login"
                            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-secondary/70 transition-all border border-border"
                        >
                            Live Demo
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="grid grid-cols-3 gap-8 mt-20 max-w-xl mx-auto"
                    >
                        {[
                            { value: '₹2.4Cr+', label: 'Fraud Blocked' },
                            { value: '10,000+', label: 'Invoices Processed' },
                            { value: '99.2%', label: 'OCR Accuracy' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">Everything your business needs</h2>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        Powered by Advanced AI, pgvector, and real-time OCR. Built for Indian MSMEs.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.1 }}
                            className={`glass-card-hover p-6 border ${feature.bg}`}
                        >
                            <div className={`w-10 h-10 rounded-lg ${feature.bg} border flex items-center justify-center mb-4`}>
                                <feature.icon className={`w-5 h-5 ${feature.color}`} />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
                    <p className="text-muted-foreground text-lg">Start free. Scale as you grow.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {pricing.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.1 }}
                            className={`glass-card p-8 flex flex-col ${plan.highlighted
                                    ? 'border-vyapar-500/50 bg-vyapar-500/5 relative'
                                    : 'border-border'
                                }`}
                        >
                            {plan.highlighted && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                                    Most Popular
                                </div>
                            )}
                            <div className="mb-6">
                                <div className="text-sm font-medium text-muted-foreground mb-1">{plan.name}</div>
                                <div className="flex items-end gap-1">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    <span className="text-muted-foreground pb-1">{plan.period}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">{plan.documents}</div>
                            </div>
                            <ul className="space-y-3 flex-1 mb-8">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-sm">
                                        <span className="text-emerald-400">✓</span>
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/auth/register"
                                className={`w-full text-center py-3 rounded-lg font-medium text-sm transition-all ${plan.highlighted
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/70 border border-border'
                                    }`}
                            >
                                {plan.cta}
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center">
                            <Brain className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-bold">VyaparAI</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © 2026 VyaparAI. Made with ❤️ for Indian MSMEs. GST processing powered by AI.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <a href="#" className="hover:text-foreground">Privacy</a>
                        <a href="#" className="hover:text-foreground">Terms</a>
                        <a href="#" className="hover:text-foreground">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
