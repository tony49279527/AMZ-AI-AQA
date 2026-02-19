import fs from "fs"
import path from "path"
import { randomBytes } from "crypto"
import { writeFileAtomically } from "./report-storage"

export interface ChatSession {
  id: string
  title: string
  updatedAt: string
}

export interface ChatMessageRecord {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  sources?: string[]
  images?: string[]
}

const ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/

function getContentDir(): string {
  const cwd = process.cwd()
  const primary = path.join(cwd, "content")
  if (fs.existsSync(primary)) return primary
  const fallback = path.join(cwd, "report-generation-system", "content")
  if (fs.existsSync(fallback)) return fallback
  return primary
}

function getChatDir(userId: string, reportId: string): string {
  if (!ID_REGEX.test(userId) || !ID_REGEX.test(reportId)) {
    throw new Error("Invalid userId or reportId")
  }
  const dir = path.join(getContentDir(), "chats", userId, reportId)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function createSessionId(): string {
  return `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`
}

// --- Sessions ---

export function getSessions(userId: string, reportId: string): ChatSession[] {
  const dir = getChatDir(userId, reportId)
  const filePath = path.join(dir, "sessions.json")
  if (!fs.existsSync(filePath)) return []
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveSessions(userId: string, reportId: string, sessions: ChatSession[]): void {
  const dir = getChatDir(userId, reportId)
  writeFileAtomically(path.join(dir, "sessions.json"), JSON.stringify(sessions, null, 2))
}

export function createSession(userId: string, reportId: string, title: string): ChatSession {
  const sessions = getSessions(userId, reportId)
  const session: ChatSession = {
    id: createSessionId(),
    title: title || "新对话",
    updatedAt: new Date().toISOString(),
  }
  sessions.unshift(session)
  saveSessions(userId, reportId, sessions)
  return session
}

export function deleteSession(userId: string, reportId: string, sessionId: string): void {
  if (!ID_REGEX.test(sessionId)) throw new Error("Invalid sessionId")
  const sessions = getSessions(userId, reportId).filter(s => s.id !== sessionId)
  saveSessions(userId, reportId, sessions)
  const dir = getChatDir(userId, reportId)
  const msgFile = path.join(dir, `${sessionId}.json`)
  if (fs.existsSync(msgFile)) fs.unlinkSync(msgFile)
}

export function updateSessionTitle(userId: string, reportId: string, sessionId: string, title: string): void {
  const sessions = getSessions(userId, reportId)
  const idx = sessions.findIndex(s => s.id === sessionId)
  if (idx >= 0) {
    sessions[idx].title = title
    sessions[idx].updatedAt = new Date().toISOString()
    saveSessions(userId, reportId, sessions)
  }
}

// --- Messages ---

export function getMessages(userId: string, reportId: string, sessionId: string): ChatMessageRecord[] {
  if (!ID_REGEX.test(sessionId)) throw new Error("Invalid sessionId")
  const dir = getChatDir(userId, reportId)
  const filePath = path.join(dir, `${sessionId}.json`)
  if (!fs.existsSync(filePath)) return []
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveMessages(userId: string, reportId: string, sessionId: string, messages: ChatMessageRecord[]): void {
  if (!ID_REGEX.test(sessionId)) throw new Error("Invalid sessionId")
  const dir = getChatDir(userId, reportId)
  writeFileAtomically(path.join(dir, `${sessionId}.json`), JSON.stringify(messages, null, 2))

  const sessions = getSessions(userId, reportId)
  const idx = sessions.findIndex(s => s.id === sessionId)
  if (idx >= 0) {
    sessions[idx].updatedAt = new Date().toISOString()
    saveSessions(userId, reportId, sessions)
  }
}

export function hasAnySessions(userId: string, reportId: string): boolean {
  try {
    const sessions = getSessions(userId, reportId)
    return sessions.length > 0
  } catch {
    return false
  }
}
