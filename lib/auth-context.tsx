"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Simulated user storage key
const USERS_STORAGE_KEY = "report_system_users"
const CURRENT_USER_KEY = "report_system_current_user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load current user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem(CURRENT_USER_KEY)
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        setUser({
          ...parsed,
          createdAt: new Date(parsed.createdAt),
        })
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  // Get all registered users from localStorage
  const getUsers = (): Record<string, { password: string; user: User }> => {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  // Save users to localStorage
  const saveUsers = (users: Record<string, { password: string; user: User }>) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const users = getUsers()
    const userRecord = users[email.toLowerCase()]

    if (!userRecord) {
      return { success: false, error: "用户不存在，请先注册" }
    }

    if (userRecord.password !== password) {
      return { success: false, error: "密码错误，请重试" }
    }

    const loggedInUser = {
      ...userRecord.user,
      createdAt: new Date(userRecord.user.createdAt),
    }

    setUser(loggedInUser)
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedInUser))

    return { success: true }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
  ): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const users = getUsers()
    const emailLower = email.toLowerCase()

    if (users[emailLower]) {
      return { success: false, error: "该邮箱已被注册" }
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email: emailLower,
      name,
      createdAt: new Date(),
    }

    users[emailLower] = {
      password,
      user: newUser,
    }

    saveUsers(users)
    setUser(newUser)
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser))

    return { success: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(CURRENT_USER_KEY)
  }

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
