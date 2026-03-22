'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import {
    User, Building, Shield, Key, Bell, CreditCard, ChevronRight,
    Save, Eye, EyeOff, CheckCircle2, Globe, LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

const PLAN_FEATURES = {
    starter: ['100 docs/month', 'Invoice OCR', 'Fraud Detection', 'Basic RAG Chat', 'Email Alerts'],
    pro: ['500 docs/month', 'All Starter features', 'Cashflow Forecasting', 'Contract Risk AI', 'API Access', 'Priority Support'],
    enterprise: ['Unlimited docs', 'All Pro features', 'Custom Integrations', 'Dedicated Account Manager', 'SLA Guarantee', 'White-label'],
}

const navItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
    { id: 'api', label: 'API Access', icon: Globe },
]

export default function SettingsPage() {
    const { user, updateUser, clearAuth } = useAuthStore()
    const [activeSection, setActiveSection] = useState('profile')
    const [showApiKey, setShowApiKey] = useState(false)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const [profile, setProfile] = useState({
        full_name: user?.full_name || '',
        company_name: user?.company_name || '',
        gstin: user?.gstin || '',
    })

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
    const [notifPrefs, setNotifPrefs] = useState({
        fraud_alerts: true,
        cashflow_alerts: true,
        contract_alerts: true,
        weekly_report: false,
        email_notifications: true,
    })

    const saveProfile = async () => {
        setSaving(true)
        // In production this would call PATCH /auth/profile
        await new Promise((r) => setTimeout(r, 800))
        updateUser(profile)
        toast.success('Profile updated successfully')
        setSaving(false)
    }

    const apiKey = `vya_${user?.tenant_id?.replace(/-/g, '').slice(0, 32)}`

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Settings</h2>
                <p className="text-muted-foreground text-sm mt-0.5">Manage your account, security, and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Settings Nav */}
                <div className="glass-card border border-border p-3 h-fit space-y-0.5">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`sidebar-item w-full ${activeSection === item.id ? 'sidebar-item-active' : ''}`}
                        >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                        </button>
                    ))}
                    <div className="pt-2 border-t border-border mt-2">
                        <button
                            onClick={() => { clearAuth(); router.push('/auth/login') }}
                            className="sidebar-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>

                {/* Settings Content */}
                <div className="lg:col-span-3">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card border border-border p-6"
                    >
                        {/* Profile */}
                        {activeSection === 'profile' && (
                            <div className="space-y-5">
                                <h3 className="font-semibold text-lg">Profile Information</h3>
                                <div className="flex items-center gap-4 pb-5 border-b border-border">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vyapar-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                        {user?.full_name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-semibold">{user?.full_name}</div>
                                        <div className="text-sm text-muted-foreground">{user?.email}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full capitalize">{user?.plan} Plan</span>
                                            <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                                        </div>
                                    </div>
                                </div>
                                {[
                                    { label: 'Full Name', key: 'full_name', placeholder: 'Your full name' },
                                    { label: 'Company Name', key: 'company_name', placeholder: 'Your company name' },
                                    { label: 'GSTIN', key: 'gstin', placeholder: '29ABCDE1234F1Z5' },
                                ].map((field) => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-medium mb-1.5">{field.label}</label>
                                        <input
                                            type="text"
                                            value={profile[field.key as keyof typeof profile]}
                                            onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                                            placeholder={field.placeholder}
                                            className="w-full px-4 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                                        />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Email</label>
                                    <input value={user?.email || ''} disabled className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed" />
                                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed. Contact support if needed.</p>
                                </div>
                                <button
                                    onClick={saveProfile}
                                    disabled={saving}
                                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-60"
                                >
                                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        )}

                        {/* Security */}
                        {activeSection === 'security' && (
                            <div className="space-y-5">
                                <h3 className="font-semibold text-lg">Security Settings</h3>
                                <div className="space-y-4">
                                    {['current', 'new', 'confirm'].map((field) => (
                                        <div key={field}>
                                            <label className="block text-sm font-medium mb-1.5 capitalize">{field.replace('_', ' ')} Password</label>
                                            <input
                                                type="password"
                                                value={passwords[field as keyof typeof passwords]}
                                                onChange={(e) => setPasswords({ ...passwords, [field]: e.target.value })}
                                                placeholder={field === 'current' ? 'Current password' : field === 'new' ? 'Min. 8 characters' : 'Repeat new password'}
                                                className="w-full px-4 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                                            />
                                        </div>
                                    ))}
                                    <button className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all">
                                        <Key className="w-4 h-4" /> Update Password
                                    </button>
                                </div>
                                <div className="pt-5 border-t border-border space-y-3">
                                    <h4 className="font-medium">Security Info</h4>
                                    {[
                                        { label: 'Last Login', value: user?.created_at ? new Date(user.created_at).toLocaleString('en-IN') : '—' },
                                        { label: 'Account Created', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : '—' },
                                        { label: 'JWT Token Expiry', value: '60 minutes' },
                                        { label: '2FA Status', value: 'Not enabled (coming soon)' },
                                    ].map((info) => (
                                        <div key={info.label} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{info.label}</span>
                                            <span className="font-medium">{info.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notifications */}
                        {activeSection === 'notifications' && (
                            <div className="space-y-5">
                                <h3 className="font-semibold text-lg">Notification Preferences</h3>
                                <div className="space-y-4">
                                    {Object.entries(notifPrefs).map(([key, value]) => {
                                        const labels: Record<string, string> = {
                                            fraud_alerts: 'Fraud Detection Alerts',
                                            cashflow_alerts: 'Cashflow Warning Alerts',
                                            contract_alerts: 'Contract Risk Alerts',
                                            weekly_report: 'Weekly Business Report',
                                            email_notifications: 'Email Notifications',
                                        }
                                        const descriptions: Record<string, string> = {
                                            fraud_alerts: 'Get notified when duplicate invoices or overcharges are detected',
                                            cashflow_alerts: 'Alerts when predicted cashflow goes negative',
                                            contract_alerts: 'Notify when contracts have high risk scores',
                                            weekly_report: 'Weekly summary of business health and insights',
                                            email_notifications: 'Receive all alerts via email',
                                        }
                                        return (
                                            <div key={key} className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-xl">
                                                <div>
                                                    <div className="text-sm font-medium">{labels[key]}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">{descriptions[key]}</div>
                                                </div>
                                                <button
                                                    onClick={() => setNotifPrefs({ ...notifPrefs, [key]: !value })}
                                                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-primary' : 'bg-muted'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5.5 left-1' : 'left-1'}`} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                    <button onClick={() => toast.success('Preferences saved')} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all">
                                        <Save className="w-4 h-4" /> Save Preferences
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Billing */}
                        {activeSection === 'billing' && (
                            <div className="space-y-5">
                                <h3 className="font-semibold text-lg">Billing & Plan</h3>
                                <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <div className="font-bold text-lg capitalize">{user?.plan} Plan</div>
                                            <div className="text-sm text-muted-foreground">
                                                {user?.plan === 'starter' ? '₹999/month' : user?.plan === 'pro' ? '₹2,999/month' : '₹9,999/month'}
                                            </div>
                                        </div>
                                        <span className="badge-success">Active</span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {(PLAN_FEATURES[user?.plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.starter).map((f) => (
                                            <li key={f} className="text-sm flex items-center gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(['pro', 'enterprise'] as const).filter(p => p !== user?.plan).map((plan) => (
                                        <div key={plan} className="glass-card border border-border p-4">
                                            <div className="font-semibold capitalize mb-1">{plan} Plan</div>
                                            <div className="text-sm text-muted-foreground mb-3">
                                                {plan === 'pro' ? '₹2,999/month · 500 docs' : '₹9,999/month · Unlimited'}
                                            </div>
                                            <button className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                                                Upgrade to {plan}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-medium mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Method</h4>
                                    <div className="p-4 bg-muted/40 rounded-xl text-sm text-muted-foreground">
                                        No payment method on file. Add a card to enable auto-renewal.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* API Access */}
                        {activeSection === 'api' && (
                            <div className="space-y-5">
                                <h3 className="font-semibold text-lg">API Access</h3>
                                <div className="p-4 bg-muted/40 rounded-xl">
                                    <div className="text-sm font-medium mb-2">Your API Key</div>
                                    <div className="flex items-center gap-3">
                                        <code className="flex-1 text-xs bg-background border border-border rounded-lg px-3 py-2 font-mono select-all">
                                            {showApiKey ? apiKey : '•'.repeat(apiKey.length)}
                                        </code>
                                        <button onClick={() => setShowApiKey(!showApiKey)} className="text-muted-foreground hover:text-foreground">
                                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('API key copied!') }} className="text-xs bg-card border border-border px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                                            Copy
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">Keep your API key secure. Do not share it publicly.</p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-3">Base URL</h4>
                                    <code className="block text-xs bg-muted/40 border border-border rounded-lg px-4 py-3 font-mono">
                                        {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1
                                    </code>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Authentication</h4>
                                    <p className="text-sm text-muted-foreground">Pass your JWT token as a Bearer token in the Authorization header:</p>
                                    <code className="block text-xs bg-muted/40 border border-border rounded-lg px-4 py-3 font-mono mt-2 whitespace-pre">
                                        {`Authorization: Bearer <your_access_token>

# Get token via:
POST /api/v1/auth/login
{ "email": "...", "password": "..." }`}
                                    </code>
                                </div>
                                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                    <div className="text-sm font-medium text-amber-400 mb-1">Plan Restriction</div>
                                    <p className="text-xs text-muted-foreground">
                                        API access is available on Pro and Enterprise plans. Upgrade to get full API access.
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
