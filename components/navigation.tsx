"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, logout, isLoading } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const links = [
    { href: "/dashboard", label: "仪表板", icon: "fa-chart-line" },
    { href: "/report/new", label: "新建报告", icon: "fa-plus-circle" },
    { href: "/settings", label: "系统设置", icon: "fa-gear" },
  ]

  const handleLogout = () => {
    logout()
    router.push("/")
    setShowUserMenu(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded-lg">
              <i className="fas fa-brain text-white text-[14px]"></i>
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">
              AI Agent Report
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-[14px] font-semibold transition-colors",
                    pathname === link.href || pathname?.startsWith(link.href)
                      ? "text-blue-600"
                      : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="w-px h-4 bg-slate-200 mx-2" />

            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[13px] font-bold border border-slate-200">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button onClick={handleLogout} className="text-[13px] font-bold text-red-500 hover:underline">退出</button>
              </div>
            ) : (
              <Link href="/login" className="text-[14px] font-bold text-blue-600">登录</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
