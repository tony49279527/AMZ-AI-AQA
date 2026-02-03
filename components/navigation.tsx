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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-[1280px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center rounded-xl">
              <i className="fas fa-brain text-primary text-sm"></i>
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">
              智能报告生成
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-sm font-medium h-[37px]",
                  pathname === link.href || pathname?.startsWith(link.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                <i className={`fas ${link.icon} text-xs`}></i>
                <span className="hidden md:inline">{link.label}</span>
              </Link>
            ))}

            <div className="w-px h-6 bg-border mx-2" />

            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="w-9 h-9 flex items-center justify-center rounded-2xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title={resolvedTheme === "dark" ? "切换为浅色" : "切换为深色"}
              >
                <i className={cn("fas text-xs", resolvedTheme === "dark" ? "fa-sun" : "fa-moon")} />
              </button>
            )}

            <div className="pl-2">
              {isLoading ? (
                <div className="w-9 h-9 rounded-2xl bg-secondary animate-pulse" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-2xl hover:bg-secondary transition-colors border border-transparent hover:border-border"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-medium max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <i
                      className={cn("fas fa-chevron-down text-[10px] text-muted-foreground transition-transform mx-1", showUserMenu && "rotate-180")}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                      <div className="px-3 py-2.5 border-b border-border/50 mb-1">
                        <div className="text-sm font-medium truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary transition-colors w-full text-sm font-medium"
                        >
                          <i className="fas fa-user-circle text-muted-foreground w-5 text-center" />
                          <span>个人设置</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors w-full text-sm font-medium text-left"
                        >
                          <i className="fas fa-sign-out-alt w-5 text-center" />
                          <span>退出登录</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="h-[37px] px-3 text-sm rounded-md">
                      登录
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="gradient" size="sm" className="h-[37px] px-4 text-sm rounded-md">
                      注册
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
