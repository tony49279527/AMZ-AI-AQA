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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-lg">
              <i className="fas fa-brain text-primary-foreground text-sm"></i>
            </div>
            <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              智能报告生成
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium",
                  pathname === link.href || pathname?.startsWith(link.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground",
                )}
              >
                <i className={`fas ${link.icon} text-xs`}></i>
                <span className="hidden md:inline">{link.label}</span>
              </Link>
            ))}

            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title={resolvedTheme === "dark" ? "切换为浅色" : "切换为深色"}
              >
                <i className={cn("fas text-xs", resolvedTheme === "dark" ? "fa-sun" : "fa-moon")} />
              </button>
            )}

            <div className="ml-2 pl-3 border-l border-border">
              {isLoading ? (
                <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-medium max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <i
                      className={cn("fas fa-chevron-down text-xs text-muted-foreground transition-transform", showUserMenu && "rotate-180")}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2.5 border-b border-border">
                        <div className="text-sm font-medium truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      </div>
                      <div className="p-1.5">
                        <Link
                          href="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-secondary transition-colors w-full text-sm"
                        >
                          <i className="fas fa-user-circle text-muted-foreground text-xs" />
                          <span>个人设置</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors w-full text-sm"
                        >
                          <i className="fas fa-sign-out-alt" />
                          <span>退出登录</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-sm bg-transparent gap-1.5">
                      <i className="fas fa-sign-in-alt text-xs" />
                      <span className="hidden md:inline">登录</span>
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="h-8 rounded-lg px-3 text-sm gap-1.5">
                      <i className="fas fa-user-plus text-xs" />
                      <span className="hidden md:inline">注册</span>
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
