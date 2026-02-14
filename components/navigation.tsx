"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const links = [
    { href: "/dashboard", label: "全部报告", icon: "fa-chart-line" },
    { href: "/report/new", label: "新建报告", icon: "fa-plus-circle" },
    { href: "/settings", label: "系统设置", icon: "fa-gear" },
  ]



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
          </div>
        </div>
      </div>
    </nav>
  )
}
