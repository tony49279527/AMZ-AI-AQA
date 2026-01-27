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

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError("请填写所有字段")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("密码长度至少为6位")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      setIsLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("请输入有效的邮箱地址")
      setIsLoading(false)
      return
    }

    const result = await register(email, password, name)

    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || "注册失败")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Background gradient effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
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
            注册
            <span className="text-primary">账号</span>
          </h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        {/* Register Card */}
        <Card className="p-8 bg-card border-border">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                用户名
                <span className="text-muted-foreground text-xs ml-2">Username</span>
              </Label>
              <div className="relative">
                <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <Input
                  id="name"
                  type="text"
                  placeholder="请输入用户名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-secondary border-border focus:border-primary"
                />
              </div>
            </div>

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
                  placeholder="至少6位字符"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary border-border focus:border-primary"
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                确认密码
                <span className="text-muted-foreground text-xs ml-2">Confirm</span>
              </Label>
              <div className="relative">
                <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  注册中...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus" />
                  注册
                  <span className="text-xs opacity-70">Register</span>
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

          {/* Login Link */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-4">
              已有账号？
              <span className="text-xs ml-1">Already have an account?</span>
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full py-6 bg-transparent gap-3">
                <i className="fas fa-sign-in-alt" />
                登录账号
                <span className="text-xs opacity-70">Sign In</span>
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
