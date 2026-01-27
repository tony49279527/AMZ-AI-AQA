"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isLoading } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const links = [
    { href: "/dashboard", label: "仪表板", icon: "fa-chart-line", subtitle: "Dashboard" },
    { href: "/report/new", label: "新建报告", icon: "fa-plus-circle", subtitle: "New Report" },
    { href: "/settings", label: "系统设置", icon: "fa-gear", subtitle: "Settings" },
  ]

  const handleLogout = () => {
    logout()
    router.push("/")
    setShowUserMenu(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg">
              <i className="fas fa-brain text-primary-foreground text-xl"></i>
            </div>
            <div>
              <div className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                智能报告生成
              </div>
              <div className="text-xs text-muted-foreground">AI Report System</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all flex items-center gap-2 group",
                  pathname === link.href || pathname?.startsWith(link.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground",
                )}
              >
                <i className={`fas ${link.icon}`}></i>
                <div className="hidden md:block">
                  <div className="text-sm font-medium">{link.label}</div>
                  <div className="text-xs opacity-70">{link.subtitle}</div>
                </div>
              </Link>
            ))}

            <div className="ml-4 pl-4 border-l border-border">
              {isLoading ? (
                <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    <i
                      className={`fas fa-chevron-down text-xs text-muted-foreground transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                    ></i>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                      <div className="p-3 border-b border-border">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                      <div className="p-2">
                        <Link
                          href="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors w-full"
                        >
                          <i className="fas fa-user-circle text-muted-foreground"></i>
                          <span className="text-sm">个人设置</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors w-full"
                        >
                          <i className="fas fa-sign-out-alt"></i>
                          <span className="text-sm">退出登录</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="bg-transparent gap-2">
                      <i className="fas fa-sign-in-alt"></i>
                      <span className="hidden md:inline">登录</span>
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="gap-2">
                      <i className="fas fa-user-plus"></i>
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
