"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

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

/** 仅用于本地/演示的模拟认证，密码以哈希形式存储。生产环境请使用后端认证（如 NextAuth + 数据库）。 */
const USERS_STORAGE_KEY = "report_system_users"
const CURRENT_USER_KEY = "report_system_current_user"

async function hashPassword(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}|${password}`)
  const buf = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window === "undefined") return null
      const storedUser = localStorage.getItem(CURRENT_USER_KEY)
      if (!storedUser) return null
      const parsed = JSON.parse(storedUser)
      return {
        ...parsed,
        createdAt: parsed?.createdAt ? new Date(parsed.createdAt) : new Date(),
      }
    } catch {
      try {
        if (typeof window !== "undefined") localStorage.removeItem(CURRENT_USER_KEY)
      } catch {
        // ignore
      }
      return null
    }
  })
  const [isLoading] = useState(false)

  type StoredUserRecord = { passwordHash: string; user: User }
  type LegacyUserRecord = { password?: string; user: User }
  const getUsers = (): Record<string, StoredUserRecord & LegacyUserRecord> => {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  const saveUsers = (users: Record<string, StoredUserRecord>) => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
    } catch {
      // ignore storage errors (e.g. quota, private mode)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const users = getUsers()
    const emailLower = email.toLowerCase()
    const userRecord = users[emailLower]

    if (!userRecord) {
      return { success: false, error: "用户不存在，请先注册" }
    }

    let passwordValid: boolean
    if ("passwordHash" in userRecord && userRecord.passwordHash) {
      const inputHash = await hashPassword(emailLower, password)
      passwordValid = userRecord.passwordHash === inputHash
    } else if ("password" in userRecord && userRecord.password !== undefined) {
      passwordValid = userRecord.password === password
    } else {
      passwordValid = false
    }

    if (!passwordValid) {
      return { success: false, error: "密码错误，请重试" }
    }

    const loggedInUser = {
      ...userRecord.user,
      createdAt: new Date(userRecord.user.createdAt),
    }

    setUser(loggedInUser)
    try {
      if (typeof window !== "undefined") localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedInUser))
    } catch {
      // ignore
    }

    // 旧数据迁移：若之前存的是明文，登录成功后改为哈希存储
    if ("password" in userRecord && userRecord.password !== undefined) {
      const passwordHash = await hashPassword(emailLower, password)
      users[emailLower] = { passwordHash, user: userRecord.user }
      saveUsers(users as Record<string, StoredUserRecord>)
    }

    return { success: true }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
  ): Promise<{ success: boolean; error?: string }> => {
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

    const passwordHash = await hashPassword(emailLower, password)
    users[emailLower] = {
      passwordHash,
      user: newUser,
    }

    saveUsers(users)
    setUser(newUser)
    try {
      if (typeof window !== "undefined") localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser))
    } catch {
      // ignore
    }

    return { success: true }
  }

  const logout = () => {
    setUser(null)
    try {
      if (typeof window !== "undefined") localStorage.removeItem(CURRENT_USER_KEY)
    } catch {
      // ignore
    }
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
