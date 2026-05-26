import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../services/api'

interface User {
    id: number
    name: string
    login: string
}

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (login: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (!token) { setLoading(false); return }
        authApi.me()
            .then((res) => setUser(res.data))
            .catch(() => localStorage.removeItem('access_token'))
            .finally(() => setLoading(false))
    }, [])

    const login = async (login: string, password: string) => {
        const res = await authApi.login(login, password)
        localStorage.setItem('access_token', res.data.access_token)
        const me = await authApi.me()
        setUser(me.data)
    }

    const logout = async () => {
        await authApi.logout().catch(() => {})
        localStorage.removeItem('access_token')
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}