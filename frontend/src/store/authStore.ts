import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
    id: string
    email: string
    full_name: string
    company_name: string
    role: string
    plan: string
    gstin: string | null
    tenant_id: string
    tenant_name: string | null
    is_verified: boolean
    created_at: string
}

interface AuthState {
    user: User | null
    accessToken: string | null
    refreshToken: string | null
    isAuthenticated: boolean

    setAuth: (user: User, accessToken: string, refreshToken: string) => void
    clearAuth: () => void
    updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,

            setAuth: (user, accessToken, refreshToken) => {
                // Also persist to localStorage for axios interceptor
                localStorage.setItem('access_token', accessToken)
                localStorage.setItem('refresh_token', refreshToken)
                set({ user, accessToken, refreshToken, isAuthenticated: true })
            },

            clearAuth: () => {
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
            },

            updateUser: (updates) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updates } : null,
                })),
        }),
        {
            name: 'vyaparai-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)
