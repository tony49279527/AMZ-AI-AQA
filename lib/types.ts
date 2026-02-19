/** 报告来源：system=本系统生成，featured=精选案例，uploaded=上传/导入 */
export type ReportSource = "system" | "featured" | "uploaded"

export interface Report {
  id: string
  title: string
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  createdAt: Date
  updatedAt: Date
  chapters: Chapter[]
  mainProductFile?: string
  competitorFile?: string
  archivedStatus?: "active" | "archived"  // 报告存档状态
  /** 来源：我的报告=system+featured，精选报告=uploaded */
  source?: ReportSource
}

export interface Chapter {
  id: string
  title: string
  order: number
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  content?: string
  subChapters?: SubChapter[]
}

export interface SubChapter {
  id: string
  title: string
  content: string
}

export interface AgentStatus {
  id: string
  name: string
  status: "idle" | "running" | "completed" | "error"
  currentTask?: string
}

export interface SystemStatus {
  backendConnected: boolean
  langGraphStatus: "online" | "offline"
  agents: AgentStatus[]
  lastUpdated: Date
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  sources?: string[]
  /** 图片生成模式下，助手回复的图片 data URL 列表 */
  images?: string[]
  reportId?: string
}
