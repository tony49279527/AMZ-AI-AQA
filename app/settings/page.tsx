"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { DEFAULT_LLM_MODEL, LLM_MODEL_OPTIONS, REPORT_CHAPTER_LABELS } from "@/lib/constants"

type AgentPriority = "high" | "medium" | "low"

type AgentConfig = {
  enabled: boolean
  priority: AgentPriority
  timeout: number
}

type AppSettings = {
  llm: {
    defaultModel: string
    temperature: number
    maxTokens: number
    apiKey: string
  }
  agents: Record<string, AgentConfig>
  dataSources: {
    youtubeApiKey: string
    youtubeEnabled: boolean
    amazonApiKey: string
    amazonEnabled: boolean
  }
  notifications: {
    emailEnabled: boolean
    email: string
    webhookEnabled: boolean
    webhookUrl: string
  }
  appearance: {
    theme: string
    compactMode: boolean
  }
}

const defaultSettings: AppSettings = {
  llm: {
    defaultModel: DEFAULT_LLM_MODEL,
    temperature: 0.7,
    maxTokens: 4096,
    apiKey: "sk-*********************",
  },
  // 与报告生成接口 CHAPTERS 的 id 一致，用于控制生成哪些章节
  agents: {
    market: { enabled: true, priority: "high", timeout: 300 },
    competitor: { enabled: true, priority: "high", timeout: 300 },
    returns: { enabled: true, priority: "medium", timeout: 240 },
    listing: { enabled: true, priority: "high", timeout: 300 },
    product: { enabled: true, priority: "medium", timeout: 240 },
    keywords: { enabled: true, priority: "medium", timeout: 240 },
    summary: { enabled: true, priority: "high", timeout: 300 },
  },
  dataSources: {
    youtubeApiKey: "AIza*********************",
    youtubeEnabled: true,
    amazonApiKey: "AKIA*********************",
    amazonEnabled: true,
  },
  notifications: {
    emailEnabled: true,
    email: "user@example.com",
    webhookEnabled: false,
    webhookUrl: "",
  },
  appearance: {
    theme: "dark",
    compactMode: false,
  },
}

function mergeSettings(partial: Partial<AppSettings>): AppSettings {
  const defaultAgentKeys = Object.keys(defaultSettings.agents) as (keyof typeof defaultSettings.agents)[]
  const mergedAgents = { ...defaultSettings.agents }
  if (partial.agents && typeof partial.agents === "object") {
    for (const key of defaultAgentKeys) {
      if (key in partial.agents && partial.agents[key]) {
        mergedAgents[key] = { ...defaultSettings.agents[key], ...partial.agents[key] }
      }
    }
  }
  return {
    ...defaultSettings,
    ...partial,
    llm: { ...defaultSettings.llm, ...partial.llm },
    agents: mergedAgents,
    dataSources: { ...defaultSettings.dataSources, ...partial.dataSources },
    notifications: { ...defaultSettings.notifications, ...partial.notifications },
    appearance: { ...defaultSettings.appearance, ...partial.appearance },
  }
}

export default function SettingsPage() {
  // 从 localStorage 加载设置（如果存在）
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("app_settings")
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<AppSettings>
          return mergeSettings(parsed)
        } catch {
          return defaultSettings
        }
      }
    }
    return defaultSettings
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem("app_settings", JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    setSettings(defaultSettings)
    if (typeof window !== "undefined") {
      localStorage.removeItem("app_settings")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-6 py-24">
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            系统
            <span className="text-primary">设置</span>
          </h1>
          <p className="text-xl text-muted-foreground">System Settings & Configuration</p>
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <strong>说明：</strong>本页设置仅部分影响后端。报告生成与问答使用的 API Key 来自服务端环境变量（OPENROUTER_API_KEY），请勿在此填写真实密钥。Agent 开关会控制新建报告时生成哪些章节；LLM 默认模型会用于新建报告与智能问答。
          </div>
        </div>

        <Tabs defaultValue="llm" className="w-full">
          <TabsList className="mb-6 bg-card border border-border p-1">
            <TabsTrigger
              value="llm"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <i className="fas fa-brain"></i>
              LLM设置
            </TabsTrigger>
            <TabsTrigger
              value="agents"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <i className="fas fa-robot"></i>
              Agent配置
            </TabsTrigger>
            <TabsTrigger
              value="datasources"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <i className="fas fa-database"></i>
              数据源
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <i className="fas fa-bell"></i>
              通知设置
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <i className="fas fa-palette"></i>
              外观
            </TabsTrigger>
          </TabsList>

          {/* LLM Settings */}
          <TabsContent value="llm">
            <Card className="p-8 bg-card border-border">
              <h2 className="text-2xl font-bold mb-6">LLM 模型配置</h2>

              <div className="space-y-6 max-w-2xl">
                <div>
                  <Label htmlFor="default-model" className="text-base mb-3 block">
                    默认模型
                  </Label>
                  <Select
                    value={settings.llm.defaultModel}
                    onValueChange={(value) =>
                      setSettings({ ...settings, llm: { ...settings.llm, defaultModel: value } })
                    }
                  >
                    <SelectTrigger id="default-model" className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LLM_MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">选择用于报告生成和问答的LLM模型（通过 OpenRouter 路由）</p>
                </div>

                <div>
                  <Label htmlFor="api-key" className="text-base mb-3 block">
                    API密钥
                  </Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={settings.llm.apiKey}
                    onChange={(e) => setSettings({ ...settings, llm: { ...settings.llm, apiKey: e.target.value } })}
                    className="bg-secondary/50 font-mono"
                  />
                  <p className="text-sm text-muted-foreground mt-2">OpenAI或其他LLM提供商的API密钥</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base">Temperature</Label>
                    <span className="text-sm font-semibold text-primary">{settings.llm.temperature}</span>
                  </div>
                  <Slider
                    value={[settings.llm.temperature]}
                    onValueChange={([value]) =>
                      setSettings({ ...settings, llm: { ...settings.llm, temperature: value } })
                    }
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    控制输出的随机性。较低的值使输出更确定，较高的值更有创意
                  </p>
                </div>

                <div>
                  <Label htmlFor="max-tokens" className="text-base mb-3 block">
                    最大Token数
                  </Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    value={settings.llm.maxTokens}
                    onChange={(e) =>
                      setSettings({ ...settings, llm: { ...settings.llm, maxTokens: Number.parseInt(e.target.value) } })
                    }
                    className="bg-secondary/50"
                  />
                  <p className="text-sm text-muted-foreground mt-2">单次生成的最大token数量</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Agent Configuration */}
          <TabsContent value="agents">
            <Card className="p-8 bg-card border-border">
              <h2 className="text-2xl font-bold mb-6">Agent 参数配置</h2>

              <div className="space-y-4">
                {Object.entries(settings.agents).map(([key, config]) => (
                  <Card key={key} className="p-5 bg-secondary/30 border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              agents: {
                                ...settings.agents,
                                [key]: { ...config, enabled: checked },
                              },
                            })
                          }
                        />
                        <div>
                          <div className="font-semibold text-base">
                            {REPORT_CHAPTER_LABELS[key] ?? key}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {config.enabled ? "已启用" : "已禁用"} · 超时: {config.timeout}s
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Select
                          value={config.priority}
                          onValueChange={(value) =>
                            setSettings({
                              ...settings,
                              agents: {
                                ...settings.agents,
                                [key]: { ...config, priority: value as "high" | "medium" | "low" },
                              },
                            })
                          }
                        >
                          <SelectTrigger className="w-32 bg-secondary/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">
                              <span className="text-primary">高优先级</span>
                            </SelectItem>
                            <SelectItem value="medium">
                              <span className="text-chart-2">中优先级</span>
                            </SelectItem>
                            <SelectItem value="low">
                              <span className="text-muted-foreground">低优先级</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <div
                          className={`w-3 h-3 rounded-full ${config.priority === "high"
                            ? "bg-primary animate-pulse"
                            : config.priority === "medium"
                              ? "bg-chart-2"
                              : "bg-muted-foreground"
                            }`}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Data Sources */}
          <TabsContent value="datasources">
            <Card className="p-8 bg-card border-border">
              <h2 className="text-2xl font-bold mb-6">外部数据源配置</h2>

              <div className="space-y-8 max-w-2xl">
                {/* YouTube */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                        <i className="fab fa-youtube text-primary text-2xl"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">YouTube API</h3>
                        <p className="text-sm text-muted-foreground">获取视频评论和用户反馈数据</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.dataSources.youtubeEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          dataSources: { ...settings.dataSources, youtubeEnabled: checked },
                        })
                      }
                    />
                  </div>
                  {settings.dataSources.youtubeEnabled && (
                    <div>
                      <Label htmlFor="youtube-key" className="text-base mb-2 block">
                        API密钥
                      </Label>
                      <Input
                        id="youtube-key"
                        type="password"
                        value={settings.dataSources.youtubeApiKey}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            dataSources: { ...settings.dataSources, youtubeApiKey: e.target.value },
                          })
                        }
                        className="bg-secondary/50 font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Amazon */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                        <i className="fab fa-amazon text-primary text-2xl"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Amazon API</h3>
                        <p className="text-sm text-muted-foreground">获取产品评价和销售数据</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.dataSources.amazonEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          dataSources: { ...settings.dataSources, amazonEnabled: checked },
                        })
                      }
                    />
                  </div>
                  {settings.dataSources.amazonEnabled && (
                    <div>
                      <Label htmlFor="amazon-key" className="text-base mb-2 block">
                        API密钥
                      </Label>
                      <Input
                        id="amazon-key"
                        type="password"
                        value={settings.dataSources.amazonApiKey}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            dataSources: { ...settings.dataSources, amazonApiKey: e.target.value },
                          })
                        }
                        className="bg-secondary/50 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card className="p-8 bg-card border-border">
              <h2 className="text-2xl font-bold mb-6">通知设置</h2>

              <div className="space-y-8 max-w-2xl">
                {/* Email Notifications */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">邮件通知</h3>
                      <p className="text-sm text-muted-foreground">报告生成完成后发送邮件通知</p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, emailEnabled: checked },
                        })
                      }
                    />
                  </div>
                  {settings.notifications.emailEnabled && (
                    <div>
                      <Label htmlFor="email" className="text-base mb-2 block">
                        邮箱地址
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.notifications.email}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, email: e.target.value },
                          })
                        }
                        className="bg-secondary/50"
                      />
                    </div>
                  )}
                </div>

                {/* Webhook Notifications */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">Webhook通知</h3>
                      <p className="text-sm text-muted-foreground">通过Webhook发送报告状态更新</p>
                    </div>
                    <Switch
                      checked={settings.notifications.webhookEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, webhookEnabled: checked },
                        })
                      }
                    />
                  </div>
                  {settings.notifications.webhookEnabled && (
                    <div>
                      <Label htmlFor="webhook" className="text-base mb-2 block">
                        Webhook URL
                      </Label>
                      <Input
                        id="webhook"
                        type="url"
                        value={settings.notifications.webhookUrl}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, webhookUrl: e.target.value },
                          })
                        }
                        placeholder="https://your-webhook-url.com/callback"
                        className="bg-secondary/50 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance">
            <Card className="p-8 bg-card border-border">
              <h2 className="text-2xl font-bold mb-6">外观设置</h2>

              <div className="space-y-8 max-w-2xl">
                <div>
                  <Label htmlFor="theme" className="text-base mb-3 block">
                    主题
                  </Label>
                  <Select
                    value={settings.appearance.theme}
                    onValueChange={(value) =>
                      setSettings({ ...settings, appearance: { ...settings.appearance, theme: value } })
                    }
                  >
                    <SelectTrigger id="theme" className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">深色主题</SelectItem>
                      <SelectItem value="light">浅色主题</SelectItem>
                      <SelectItem value="auto">跟随系统</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">当前使用特斯拉黑红配色方案</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base">紧凑模式</h3>
                    <p className="text-sm text-muted-foreground">减少界面元素间距，显示更多内容</p>
                  </div>
                  <Switch
                    checked={settings.appearance.compactMode}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        appearance: { ...settings.appearance, compactMode: checked },
                      })
                    }
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-8 flex justify-end gap-4">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={handleReset} aria-label="重置为默认设置">
            <i className="fas fa-rotate-left" aria-hidden></i>
            重置为默认
          </Button>
          <Button onClick={handleSave} size="lg" className="gap-2 px-8" aria-label={saved ? "已保存" : "保存设置"}>
            {saved ? (
              <>
                <i className="fas fa-check"></i>
                已保存
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                保存设置
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
