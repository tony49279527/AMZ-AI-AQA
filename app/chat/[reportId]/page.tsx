"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ChatMessage } from "@/lib/types"
import { useParams } from "next/navigation"

export default function ChatPage() {
  const params = useParams()
  const reportId = params.reportId as string
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "system",
      content: "欢迎使用智能问答系统！我已加载您的报告，可以回答关于报告内容的任何问题。",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [showContext, setShowContext] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [reportContext] = useState({
    title: "特斯拉 vs 蔚来竞品分析报告",
    chapters: ["市场分析", "竞品分析", "产品特性", "定价策略", "客户洞察"],
    activeChapter: "市场分析",
  })

  const quickQuestions = [
    "总结一下主要竞争优势",
    "市场份额对比如何？",
    "定价策略有什么区别？",
    "客户反馈的关键点是什么？",
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      reportId,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsStreaming(true)

    // Simulate AI streaming response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "根据报告分析，特斯拉在技术创新和品牌影响力方面具有显著优势，而蔚来则在用户服务和本土化体验上表现突出。市场份额方面，特斯拉占据约35%，蔚来约为15%...",
        timestamp: new Date(),
        reportId,
        sources: ["第2章: 竞品分析", "第4章: 定价策略"],
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsStreaming(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-6 py-24">
        <div className="flex gap-6 h-[calc(100vh-8rem)]">
          {/* Left Sidebar - Chat History */}
          {showHistory && (
            <Card className="w-64 p-4 bg-card border-border flex-shrink-0 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">聊天历史</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(false)}
                  className="h-8 w-8 hover:bg-primary/20"
                >
                  <i className="fas fa-chevron-left text-sm"></i>
                </Button>
              </div>
              <div className="space-y-2">
                {["特斯拉 vs 蔚来竞品分析", "iPhone 15 Pro 对比分析", "抖音市场策略讨论"].map((title, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg cursor-pointer transition-all text-sm ${
                      idx === 0 ? "bg-primary/20 border-l-2 border-primary" : "hover:bg-secondary"
                    }`}
                  >
                    <div className="font-medium mb-1">{title}</div>
                    <div className="text-xs text-muted-foreground">{idx === 0 ? "活跃中" : `${idx + 2}小时前`}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <Card className="p-4 bg-card border-border mb-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                {!showHistory && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHistory(true)}
                    className="h-8 w-8 hover:bg-primary/20"
                  >
                    <i className="fas fa-chevron-right text-sm"></i>
                  </Button>
                )}
                <div>
                  <h2 className="font-bold text-lg">{reportContext.title}</h2>
                  <p className="text-xs text-muted-foreground">智能问答 | AI Q&A</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <i className="fas fa-download"></i>
                  导出对话
                </Button>
              </div>
            </Card>

            {/* Messages */}
            <Card className="flex-1 p-6 bg-card border-border overflow-y-auto mb-4">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.role === "system" && (
                      <div className="flex justify-center">
                        <div className="bg-secondary/50 px-4 py-2 rounded-full text-sm text-muted-foreground">
                          <i className="fas fa-info-circle mr-2"></i>
                          {message.content}
                        </div>
                      </div>
                    )}

                    {message.role === "user" && (
                      <div className="flex justify-end">
                        <div className="max-w-[70%]">
                          <div className="bg-primary text-primary-foreground px-6 py-4 rounded-2xl rounded-tr-sm">
                            <p className="text-base leading-relaxed">{message.content}</p>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 text-right">
                            {message.timestamp.toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {message.role === "assistant" && (
                      <div className="flex justify-start">
                        <div className="max-w-[70%]">
                          <div className="bg-secondary px-6 py-4 rounded-2xl rounded-tl-sm">
                            <p className="text-base leading-relaxed whitespace-pre-line">{message.content}</p>
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <div className="text-xs text-muted-foreground mb-2">
                                  <i className="fas fa-book mr-1"></i>
                                  来源章节:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {message.sources.map((source, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-primary/20 text-primary rounded text-xs cursor-pointer hover:bg-primary/30 transition-all"
                                    >
                                      {source}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {message.timestamp.toLocaleTimeString("zh-CN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyMessage(message.content)}
                              className="h-6 px-2 text-xs hover:text-primary hover:bg-primary/10"
                            >
                              <i className="fas fa-copy mr-1"></i>
                              复制
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="bg-secondary px-6 py-4 rounded-2xl rounded-tl-sm">
                      <div className="flex gap-2">
                        <div
                          className="w-2 h-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: "0s" }}
                        />
                        <div
                          className="w-2 h-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <div
                          className="w-2 h-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </Card>

            {/* Input Area */}
            <Card className="p-4 bg-card border-border flex-shrink-0">
              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2 mb-3">
                {quickQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(question)}
                    className="text-xs bg-transparent hover:bg-primary/20 hover:text-primary hover:border-primary"
                  >
                    <i className="fas fa-lightbulb mr-1"></i>
                    {question}
                  </Button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入您的问题... (Ctrl+Enter 发送)"
                    className="min-h-[60px] max-h-[200px] resize-none bg-secondary/50 pr-12"
                  />
                  <Button variant="ghost" size="icon" className="absolute bottom-2 right-2 h-8 w-8 hover:bg-primary/20">
                    <i className="fas fa-paperclip text-muted-foreground"></i>
                  </Button>
                </div>
                <Button onClick={handleSend} disabled={!input.trim() || isStreaming} size="lg" className="px-8 gap-2">
                  <i className="fas fa-paper-plane"></i>
                  发送
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                <i className="fas fa-info-circle mr-1"></i>
                AI基于您的报告内容回答问题，答案仅供参考
              </p>
            </Card>
          </div>

          {/* Right Sidebar - Report Context */}
          {showContext && (
            <Card className="w-80 p-4 bg-card border-border flex-shrink-0 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">报告上下文</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowContext(false)}
                  className="h-8 w-8 hover:bg-primary/20"
                >
                  <i className="fas fa-chevron-right text-sm"></i>
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">当前报告</div>
                  <div className="font-semibold">{reportContext.title}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-3">可用章节</div>
                  <div className="space-y-2">
                    {reportContext.chapters.map((chapter, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          chapter === reportContext.activeChapter
                            ? "bg-primary/20 border-l-2 border-primary"
                            : "bg-secondary/30 hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{chapter}</span>
                          <i className="fas fa-chevron-right text-xs text-muted-foreground"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-lightbulb text-primary mt-1"></i>
                    <div>
                      <div className="text-sm font-semibold mb-1">提示</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        您可以询问关于报告中任何章节的问题，AI会引用相关章节内容为您解答。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Toggle buttons when sidebars are hidden */}
          {!showContext && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowContext(true)}
              className="fixed right-6 top-32 h-10 w-10 bg-card hover:bg-primary/20"
            >
              <i className="fas fa-chevron-left text-sm"></i>
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
