import axios from 'axios'
import { toast } from 'sonner'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
    baseURL: `${API_BASE}/api/v1`,
    headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
    }
    return config
})

// Handle 401 – auto-refresh or logout
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true
            try {
                const refresh = localStorage.getItem('refresh_token')
                if (refresh) {
                    const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
                        refresh_token: refresh,
                    })
                    localStorage.setItem('access_token', data.access_token)
                    localStorage.setItem('refresh_token', data.refresh_token)
                    original.headers.Authorization = `Bearer ${data.access_token}`
                    return api(original)
                }
            } catch {
                // Refresh failed – clear storage
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                localStorage.removeItem('user')
                window.location.href = '/auth/login'
            }
        }
        const message = error.response?.data?.detail || error.message || 'An error occurred'
        if (error.response?.status !== 401) {
            toast.error(message)
        }
        return Promise.reject(error)
    }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
    refresh: (data: any) => api.post('/auth/refresh', data),
    me: () => api.get('/auth/me'),
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export const dashboardApi = {
    summary: () => api.get('/dashboard/summary'),
}

// ── Documents ──────────────────────────────────────────────────────────────
export const documentsApi = {
    upload: (formData: FormData) =>
        api.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    list: (params?: any) => api.get('/documents/', { params }),
    get: (id: string) => api.get(`/documents/${id}`),
    delete: (id: string) => api.delete(`/documents/${id}`),
}

// ── Invoices ──────────────────────────────────────────────────────────────
export const invoicesApi = {
    list: (params?: any) => api.get('/invoices/', { params }),
    get: (id: string) => api.get(`/invoices/${id}`),
    stats: () => api.get('/invoices/stats'),
}

// ── Contracts ──────────────────────────────────────────────────────────────
export const contractsApi = {
    list: (params?: any) => api.get('/contracts/', { params }),
    get: (id: string) => api.get(`/contracts/${id}`),
}

// ── Vendors ──────────────────────────────────────────────────────────────
export const vendorsApi = {
    list: (params?: any) => api.get('/vendors/', { params }),
    heatmap: () => api.get('/vendors/heatmap'),
    analytics: () => api.get('/vendors/analytics'),
}

// ── Cashflow ──────────────────────────────────────────────────────────────
export const cashflowApi = {
    forecast: (horizon_days = 30) => api.get('/cashflow/forecast', { params: { horizon_days } }),
    history: (limit = 10) => api.get('/cashflow/history', { params: { limit } }),
}

// ── Alerts ──────────────────────────────────────────────────────────────
export const alertsApi = {
    list: (params?: any) => api.get('/alerts/', { params }),
    resolve: (id: string, note = '') => api.patch(`/alerts/${id}/resolve`, null, { params: { note } }),
    stats: () => api.get('/alerts/stats'),
}

// ── Chat ──────────────────────────────────────────────────────────────────
export const chatApi = {
    sendMessage: (data: { question: string; session_id?: string }) =>
        api.post('/chat/message', data),
    history: (params?: any) => api.get('/chat/history', { params }),
    rate: (id: string, rating: number) => api.post(`/chat/history/${id}/rate`, null, { params: { rating } }),
}

// ── Admin ──────────────────────────────────────────────────────────────────
export const adminApi = {
    metrics: () => api.get('/admin/metrics'),
    tenants: (params?: any) => api.get('/admin/tenants', { params }),
}

// ── Billing ──────────────────────────────────────────────────────────────────
export const billingApi = {
    checkout: (plan: string) => api.post('/billing/checkout', { plan }),
    planFeatures: () => api.get('/billing/plan-features'),
    usage: () => api.get('/billing/usage'),
}

// ── Insights ──────────────────────────────────────────────────────────────
export const insightsApi = {
    spendAnalysis: () => api.get('/insights/spend-analysis'),
}

// ── Audit ──────────────────────────────────────────────────────────────────
export const auditApi = {
    list: (params?: any) => api.get('/audit/', { params }),
}

