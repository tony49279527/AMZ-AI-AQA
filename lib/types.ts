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
  reportId?: string
}
