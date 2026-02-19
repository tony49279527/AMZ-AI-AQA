"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
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

            {/* 移动端汉堡按钮 */}
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="切换导航菜单"
            >
              <i className={cn("fas text-slate-600", mobileOpen ? "fa-xmark" : "fa-bars")} />
            </button>
          </div>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white shadow-lg">
          <div className="px-4 py-3 flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href || pathname?.startsWith(link.href)
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <i className={cn("fas w-4 text-center", link.icon)} />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
