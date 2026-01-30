'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const AuthContext = createContext({
    user: null,
    loading: true,
    login: () => { },
    logout: () => { },
    isAuthenticated: false
})

import { apiCall } from '@/lib/api-client'

// Idle timeout configuration (in milliseconds)
const IDLE_TIMEOUT_CONFIG = {
    superadmin: null,           // No idle timeout for superadmin
    admin: 7 * 60 * 1000,       // 7 minutes for admin (user requirement)
    default: 7 * 60 * 1000      // 7 minutes for staff/others
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const idleTimerRef = useRef(null)
    const warningTimerRef = useRef(null)

    // Get idle timeout based on role
    const getIdleTimeout = useCallback((role) => {
        if (role === 'superadmin') return null
        return IDLE_TIMEOUT_CONFIG[role] || IDLE_TIMEOUT_CONFIG.default
    }, [])

    // Logout function
    const logout = useCallback(async (isIdleTimeout = false) => {
        // Clear timers
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

        // Log logout activity before clearing session
        try {
            await apiCall('/admin/logout', { method: 'POST' });
        } catch (err) {
            // Silently fail - don't block logout if API fails
            console.warn('Could not log logout activity', err);
        }

        // Store user info for MFA-only re-auth if idle timeout
        if (isIdleTimeout && user) {
            localStorage.setItem('idleLogoutEmail', user.email);
            localStorage.setItem('idleLogoutTime', Date.now().toString());
        }

        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('lastActivity')
        setUser(null)

        if (isIdleTimeout) {
            toast.warning('Session expired due to inactivity. Please verify with MFA to continue.')
            router.push('/admin/login?mfa_only=true')
        } else {
            router.push('/login')
        }
    }, [router, user])

    // Reset idle timer on user activity
    const resetIdleTimer = useCallback(() => {
        if (!user || user.role === 'superadmin') return

        const idleTimeout = getIdleTimeout(user.role)
        if (!idleTimeout) return

        // Clear existing timers
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

        // Store last activity time
        localStorage.setItem('lastActivity', Date.now().toString())

        // Warning 1 minute before logout
        const warningTime = idleTimeout - 60000
        if (warningTime > 0) {
            warningTimerRef.current = setTimeout(() => {
                toast.warning('Your session will expire in 1 minute due to inactivity.')
            }, warningTime)
        }

        // Set new idle timer
        idleTimerRef.current = setTimeout(() => {
            logout(true) // true = idle timeout
        }, idleTimeout)
    }, [user, getIdleTimeout, logout])

    // Setup idle detection
    useEffect(() => {
        if (!user || user.role === 'superadmin') return

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

        const handleActivity = () => {
            resetIdleTimer()
        }

        // Add event listeners
        events.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true })
        })

        // Initial timer setup
        resetIdleTimer()

        // Check for existing session on page load
        const lastActivity = localStorage.getItem('lastActivity')
        if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity)
            const idleTimeout = getIdleTimeout(user.role)
            if (idleTimeout && elapsed > idleTimeout) {
                logout(true)
            }
        }

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleActivity)
            })
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
        }
    }, [user, resetIdleTimer, getIdleTimeout, logout])

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token')
            const storedUser = localStorage.getItem('user')

            if (token && storedUser) {
                try {
                    let parsedUser = JSON.parse(storedUser)

                    // Verify token / Refresh profile
                    if (parsedUser.role === 'b2b_user') {
                        try {
                            const b2bProfile = await apiCall('/b2b/profile')
                            parsedUser = { ...parsedUser, b2b_status: b2bProfile.status, b2b_profile: b2bProfile }
                        } catch (err) {
                            console.error('Failed to fetch B2B profile', err)
                        }
                    }

                    setUser(parsedUser)
                } catch (e) {
                    console.error('Failed to parse user data', e)
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    localStorage.removeItem('lastActivity')
                }
            }
            setLoading(false)
        }

        initAuth()
    }, [])

    const login = async (token, userData) => {
        // Clear any existing timers
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

        localStorage.setItem('token', token)
        localStorage.setItem('lastActivity', Date.now().toString())

        let finalUser = userData
        if (userData.role === 'b2b_user') {
            try {
                const b2bProfile = await apiCall('/b2b/profile')
                finalUser = { ...userData, b2b_status: b2bProfile.status, b2b_profile: b2bProfile }
            } catch (err) {
                console.warn('Could not fetch B2B profile on login', err)
            }
        }

        localStorage.setItem('user', JSON.stringify(finalUser))
        setUser(finalUser)
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout: () => logout(false),
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
