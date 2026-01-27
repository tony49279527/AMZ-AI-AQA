"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!email || !password) {
      setError("请填写所有字段")
      setIsLoading(false)
      return
    }

    const result = await login(email, password)

    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "登录失败")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-16 h-16 bg-primary mx-auto mb-4 rounded-2xl flex items-center justify-center">
              <i className="fas fa-brain text-primary-foreground text-3xl"></i>
            </div>
          </Link>
          <h1 className="text-4xl font-bold mb-2">
            登录
            <span className="text-primary">系统</span>
          </h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <Card className="p-8 bg-card border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                邮箱地址
                <span className="text-muted-foreground text-xs ml-2">Email</span>
              </Label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary border-border focus:border-primary"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                密码
                <span className="text-muted-foreground text-xs ml-2">Password</span>
              </Label>
              <div className="relative">
                <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary border-border focus:border-primary"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
                <i className="fas fa-exclamation-circle" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full py-6 text-lg gap-3" disabled={isLoading}>
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin" />
                  登录中...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt" />
                  登录
                  <span className="text-xs opacity-70">Sign In</span>
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-4 text-muted-foreground">或者</span>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-4">
              还没有账号？
              <span className="text-xs ml-1">Don't have an account?</span>
            </p>
            <Link href="/register">
              <Button variant="outline" className="w-full py-6 bg-transparent gap-3">
                <i className="fas fa-user-plus" />
                注册新账号
                <span className="text-xs opacity-70">Register</span>
              </Button>
            </Link>
          </div>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-muted-foreground text-sm hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <i className="fas fa-arrow-left" />
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
