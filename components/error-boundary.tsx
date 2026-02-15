"use client"

import type React from "react"
import { Component } from "react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: { componentStack: string } | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("Error caught by boundary:", error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full">
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
                  <i className="fas fa-exclamation-triangle text-red-600 text-lg" />
                </div>

                <h2 className="text-center text-xl font-bold text-slate-900 mb-2">
                  出错了
                </h2>
                <p className="text-center text-slate-600 text-sm mb-6">
                  系统遇到了一个错误，请稍后重试。
                </p>

                {this.state.error && (
                  <details className="mb-6 text-xs">
                    <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                      错误详情
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-50 rounded border border-slate-200 overflow-auto max-h-40 text-slate-700">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                  >
                    重新加载
                  </button>
                  <button
                    onClick={() => window.location.href = "/dashboard"}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                  >
                    返回首页
                  </button>
                </div>

                <p className="text-center text-xs text-slate-400 mt-4">
                  如果问题持续存在，请<a href="mailto:support@example.com" className="text-blue-600 hover:underline">联系支持</a>
                </p>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
